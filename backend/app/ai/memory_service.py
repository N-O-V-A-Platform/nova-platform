"""
N.O.V.A. Agentic Memory Service

Implements a two-tier memory system backed by Redis:

  LONG-TERM MEMORY (Semantic Answer Cache)
  ─────────────────────────────────────────
  Stores answered Q&A pairs with their embedding vectors.
  On new incoming questions, performs cosine similarity search against
  cached entries for the same course. If similarity ≥ SIMILARITY_THRESHOLD,
  returns the cached answer immediately without calling the LLM API.

  - Cache entries are stored per course to prevent cross-course answer bleed
  - Human-resolved escalation answers are stored with priority score 1.0
  - TTL: 30 days, refreshed on each cache hit
  - Key scheme:
      nova:mem:{course_id}:{entry_id}  → JSON payload
      nova:mem:idx:{course_id}         → list of all entry IDs for that course

  SHORT-TERM MEMORY (Session Context Cache)
  ──────────────────────────────────────────
  Caches the last 8 turns of a conversation in Redis to avoid
  repeated DB queries within the same active session.

  - TTL: 2 hours (refreshed on each access)
  - Key scheme: nova:session:{conversation_id}
"""

import json
import math
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

        Returns:
            (answer_text, similarity_score) if a match is found, else None.
        """
        r = await self._get_redis()
        idx_key = f"nova:mem:idx:{course_id}"

        # Fetch the list of cache entry IDs for this course
        entry_ids = await r.lrange(idx_key, 0, MAX_SCAN_ENTRIES - 1)
        if not entry_ids:
            return None

        best_score = 0.0
        best_answer = None

        for entry_id in entry_ids:
            entry_key = f"nova:mem:{course_id}:{entry_id}"
            raw = await r.get(entry_key)
            if not raw:
                continue

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

            sim = _cosine_similarity(query_embedding, cached_emb)

            if sim > best_score:
                best_score = sim
                best_answer = entry.get("answer", "")

                # Refresh TTL on the matched entry (it's still being used)
                await r.expire(entry_key, LONG_TERM_TTL)

        if best_score >= SIMILARITY_THRESHOLD and best_answer:
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

        # Human answers go to the front of the index (highest priority)
        if source == "human":
            await r.lpush(idx_key, entry_id)
        else:
            await r.rpush(idx_key, entry_id)

        # Cap the index list to MAX_SCAN_ENTRIES (trim oldest entries)
        await r.ltrim(idx_key, 0, MAX_SCAN_ENTRIES - 1)
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
        """
        r = await self._get_redis()
        key = f"nova:session:{conversation_id}"
        await r.set(key, json.dumps(history), ex=SHORT_TERM_TTL)

    async def invalidate_session(self, conversation_id: str) -> None:
        """Clear session cache for a conversation (e.g., on new message)."""
        r = await self._get_redis()
        await r.delete(f"nova:session:{conversation_id}")
