import json
import math
import time
import uuid
from typing import Dict, List, Optional, Tuple

import redis.asyncio as aioredis

from app.core.config import settings

# Similarity threshold: questions with cosine similarity ≥ this value
# will be answered from cache without any LLM API call.
SIMILARITY_THRESHOLD = 0.88

# TTLs in seconds
LONG_TERM_TTL = 30 * 24 * 3600   # 30 days
SHORT_TERM_TTL = 2 * 3600         # 2 hours

# Maximum number of cache entries to scan per course during similarity search.
# Prevents O(n) slowdown if a course has thousands of cached answers.
MAX_SCAN_ENTRIES = 500


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Pure-Python cosine similarity between two pre-normalised vectors."""
    if len(a) != len(b):
        raise ValueError(
            f"Embedding dimension mismatch: {len(a)} != {len(b)}"
        )
    # Both vectors are L2-normalised by EmbeddingService, so dot product = cosine similarity
    return sum(x * y for x, y in zip(a, b))


class MemoryService:
    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = await aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
        return self._redis

    async def initialize(self) -> None:
        """Pre-initialize the Redis connection on startup to avoid connection races."""
        await self._get_redis()

    # ──────────────────────────────────────────────────────────
    # LONG-TERM MEMORY: Semantic Answer Cache
    # ──────────────────────────────────────────────────────────

    async def search_long_term(
        self,
        query_embedding: List[float],
        course_id: str,
        namespace: str,
        corpus_version: str
    ) -> Optional[Tuple[str, float]]:
        """
        Search the long-term semantic cache for a similar past question.
        Ensures that namespace and corpus_version match to prevent stale/incorrect cache hits.
        Uses Redis pipelining to avoid N+1 queries.

        Returns:
            (answer_text, similarity_score) if a match is found, else None.
        """
        r = await self._get_redis()
        idx_key = f"nova:mem:idx:{course_id}"

        # Fetch the list of cache entry IDs for this course from Sorted Set (newest first)
        entry_ids = await r.zrevrange(idx_key, 0, MAX_SCAN_ENTRIES - 1)
        if not entry_ids:
            return None

        # Pipelined batch retrieval to avoid N+1 network requests
        pipe = r.pipeline()
        for entry_id in entry_ids:
            pipe.get(f"nova:mem:{course_id}:{entry_id}")
        raw_entries = await pipe.execute()

        best_score = 0.0
        best_answer = None
        best_source = None
        best_entry_key = None
        expired_ids = []

        for entry_id, raw in zip(entry_ids, raw_entries):
            if not raw:
                expired_ids.append(entry_id)
                continue

            entry_key = f"nova:mem:{course_id}:{entry_id}"
            try:
                entry = json.loads(raw)
            except json.JSONDecodeError:
                continue

            # Verify namespace and corpus version match current query context
            if entry.get("namespace") != namespace:
                continue
            if entry.get("corpus_version") != corpus_version:
                continue

            cached_emb = entry.get("embedding")
            if not cached_emb:
                continue

            try:
                sim = _cosine_similarity(query_embedding, cached_emb)
            except ValueError:
                # Dimension mismatch (e.g. model change)
                continue

            # Prioritization Logic:
            # 1. Prefer lecturer/human-verified answers if both are above SIMILARITY_THRESHOLD.
            # 2. Otherwise, prefer the higher similarity score.
            is_better = False
            if best_answer is None:
                is_better = True
            else:
                current_is_human = (best_source == "human" and best_score >= SIMILARITY_THRESHOLD)
                cand_is_human = (entry.get("source") == "human" and sim >= SIMILARITY_THRESHOLD)

                if cand_is_human and not current_is_human:
                    is_better = True
                elif not cand_is_human and current_is_human:
                    is_better = False
                else:
                    is_better = sim > best_score

            if is_better:
                best_score = sim
                best_answer = entry.get("answer", "")
                best_source = entry.get("source", "rag")
                best_entry_key = entry_key

        # Asynchronously clean up any expired IDs from the Sorted Set index
        if expired_ids:
            await r.zrem(idx_key, *expired_ids)

        if best_score >= SIMILARITY_THRESHOLD and best_answer:
            # Refresh TTL on the matched entry and the index (still actively used)
            if best_entry_key:
                await r.expire(best_entry_key, LONG_TERM_TTL)
            await r.expire(idx_key, LONG_TERM_TTL)
            return best_answer, best_score

        return None

    async def store_long_term(
        self,
        question: str,
        answer: str,
        embedding: List[float],
        course_id: str,
        namespace: str,
        corpus_version: str,
        confidence: float,
        source: str = "rag"
    ) -> None:
        """
        Store a Q&A pair in the long-term semantic cache with version and namespace scoping.

        Args:
            question: The student's original question text.
            answer: The answer (from RAG/LLM or lecturer).
            embedding: The pre-computed question embedding vector.
            course_id: Scopes the cache to a specific course.
            namespace: The target Pinecone namespace.
            corpus_version: Combined SHA-256 of all relevant document states.
            confidence: The confidence/similarity score of the answer.
            source: "rag" for LLM-generated, "human" for lecturer-resolved.
        """
        # Only cache answers that are reasonably confident
        if confidence < 0.65 and source != "human":
            return

        r = await self._get_redis()
        entry_id = str(uuid.uuid4())
        entry_key = f"nova:mem:{course_id}:{entry_id}"
        idx_key = f"nova:mem:idx:{course_id}"

        payload = json.dumps({
            "question": question,
            "answer": answer,
            "embedding": embedding,
            "confidence": confidence,
            "source": source,
            "course_id": course_id,
            "namespace": namespace,
            "corpus_version": corpus_version
        })

        # Store entry with TTL
        await r.set(entry_key, payload, ex=LONG_TERM_TTL)

        # Store in Sorted Set using current timestamp as score to retain chronological order
        await r.zadd(idx_key, {entry_id: time.time()})

        # Cap the index sorted set to MAX_SCAN_ENTRIES (trim oldest entries)
        await r.zremrangebyrank(idx_key, 0, -MAX_SCAN_ENTRIES - 1)
        await r.expire(idx_key, LONG_TERM_TTL)

    # ──────────────────────────────────────────────────────────
    # SHORT-TERM MEMORY: Session Conversation Context Cache
    # ──────────────────────────────────────────────────────────

    async def get_session_history(
        self, conversation_id: str
    ) -> Optional[List[Dict[str, str]]]:
        """
        Retrieve cached conversation history for a session.
        Returns None if not in cache (caller should fall back to DB).
        """
        r = await self._get_redis()
        key = f"nova:session:{conversation_id}"
        raw = await r.get(key)
        if not raw:
            return None
        try:
            history = json.loads(raw)
            # Refresh TTL since session is still active
            await r.expire(key, SHORT_TERM_TTL)
            return history
        except json.JSONDecodeError:
            return None

    async def set_session_history(
        self,
        conversation_id: str,
        history: List[Dict[str, str]]
    ) -> None:
        """
        Store conversation history in Redis for fast retrieval.
        Enforces a maximum of the last 8 turns (16 messages) to fit session memory guidelines.
        """
        r = await self._get_redis()
        key = f"nova:session:{conversation_id}"
        bounded_history = history[-16:]
        await r.set(key, json.dumps(bounded_history), ex=SHORT_TERM_TTL)

    async def invalidate_session(self, conversation_id: str) -> None:
        """Clear session cache for a conversation (e.g., on new message)."""
        r = await self._get_redis()
        await r.delete(f"nova:session:{conversation_id}")
