"""
N.O.V.A. RAG Service — Agentic Pipeline with Memory

Provider priority (cascade on failure):
  1. NVIDIA Nemotron (nvidia/llama-3.1-nemotron-70b-instruct) via NIM API
  2. Groq (llama-3.1-8b-instant)
  3. OpenRouter (meta-llama/llama-3.1-8b-instruct:free)

Memory pipeline (before any LLM call):
  1. Check Redis long-term semantic cache for a similar past question
     → Cache HIT (similarity ≥ 0.88): return cached answer, 0 tokens used
     → Cache MISS: proceed with full RAG + LLM pipeline
  2. After LLM generates an answer: store Q+A in long-term cache for future hits
"""

import asyncio
from typing import Dict, List, Optional, Tuple

from openai import AsyncOpenAI

from app.core.config import settings
from app.ai.embeddings import EmbeddingService
from app.ai.vector_store import PineconeVectorStore
from app.ai.memory_service import MemoryService


class RAGService:
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.vector_store = PineconeVectorStore()
        self.memory = MemoryService()

        # ── LLM Provider Setup ────────────────────────────────────────────────
        self.use_nvidia = bool(settings.NVIDIA_API_KEY)
        self.use_groq = bool(settings.GROQ_API_KEY)
        self.use_openrouter = bool(settings.OPENROUTER_API_KEY)

        if self.use_nvidia:
            # NVIDIA NIM is fully OpenAI API-compatible
            self.nvidia_client = AsyncOpenAI(
                api_key=settings.NVIDIA_API_KEY,
                base_url="https://integrate.api.nvidia.com/v1"
            )

        if self.use_groq:
            self.groq_client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1"
            )

        if self.use_openrouter:
            self.openrouter_client = AsyncOpenAI(
                api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1"
            )

    def _build_messages(
        self,
        system_prompt: str,
        chat_history: List[Dict[str, str]],
        query: str
    ) -> List[Dict[str, str]]:
        """Build the message list for an LLM API call."""
        messages = [{"role": "system", "content": system_prompt}]
        for msg in chat_history:
            role = "assistant" if msg["role"] == "assistant" else "user"
            messages.append({"role": role, "content": msg["content"]})
        messages.append({"role": "user", "content": query})
        return messages

    async def get_response(
        self,
        query: str,
        course_id: str,
        namespace: str,
        chat_history: List[Dict[str, str]] = None,
        confidence_threshold: float = 0.65
    ) -> Tuple[str, float, bool]:
        """
        Executes the full agentic RAG pipeline with memory.

        Order of operations:
          1. Embed the query (local, free, deterministic)
          2. Search long-term memory (Redis semantic cache)
          3. If cache hit → return immediately (0 API tokens)
          4. If cache miss → RAG retrieval → LLM generation
          5. Store new answer in long-term memory
          6. Return answer

        Returns:
            Tuple[answer_text, confidence_score, should_escalate]
        """
        if chat_history is None:
            chat_history = []

        escalation_flag_phrase = (
            "I cannot find this information in the course materials. "
            "I have escalated this question to your lecturer."
        )

        # ── Step 1: Embed the query (local sentence-transformers) ─────────────
        try:
            query_emb = await self.embedding_service.get_embedding(query)
        except Exception as e:
            return f"Error creating query embedding: {str(e)}", 0.0, True

        # ── Step 2: Search long-term semantic memory (Redis) ──────────────────
        try:
            cache_result = await self.memory.search_long_term(
                query_embedding=query_emb,
                course_id=course_id
            )
            if cache_result:
                cached_answer, cache_similarity = cache_result
                # Return the cached answer — zero LLM tokens consumed
                return cached_answer, cache_similarity, False
        except Exception:
            # Memory lookup failure is non-fatal; fall through to full pipeline
            pass

        # ── Step 3: Query Pinecone for relevant course document chunks ─────────
        try:
            # Retrieve course-specific context chunks
            matches = await self.vector_store.query_chunks(
                query_embedding=query_emb,
                namespace=namespace,
                top_k=5
            )
            
            # Also retrieve global scraped UiPath documentation/community context
            try:
                global_matches = await self.vector_store.query_chunks(
                    query_embedding=query_emb,
                    namespace="uipath_global",
                    top_k=5
                )
                # Merge and select top 5 by similarity score
                matches.extend(global_matches)
                matches.sort(key=lambda x: x.get("score", 0.0), reverse=True)
                matches = matches[:5]
            except Exception as ge:
                print(f"[NOVA RAG] Warning: failed to retrieve global uipath_global context: {ge}")
        except Exception as e:
            return f"Error retrieving course materials context: {str(e)}", 0.0, True

        # ── Step 4: Assess confidence from vector similarity scores ───────────
        best_score = 0.0
        context_chunks = []
        for m in matches:
            text = m["text"]
            meta_parts = []
            if m.get("product"):
                meta_parts.append(f"Product: {m['product']}")
            if m.get("version"):
                meta_parts.append(f"Version: {m['version']}")
            if m.get("title"):
                meta_parts.append(f"Title: {m['title']}")
            if m.get("source_url"):
                meta_parts.append(f"Source URL: {m['source_url']}")
                
            if meta_parts:
                meta_str = ", ".join(meta_parts)
                formatted_chunk = f"[{meta_str}]\n{text}"
            else:
                formatted_chunk = text

            context_chunks.append(formatted_chunk)
            if m["score"] > best_score:
                best_score = m["score"]

        # If similarity is below threshold, escalate without calling the LLM
        if best_score < confidence_threshold:
            return escalation_flag_phrase, best_score, True

        # ── Step 5: Build system prompt with RAG context ──────────────────────
        context_text = "\n---\n".join(context_chunks)

        system_prompt = f"""You are N.O.V.A., an AI educational assistant for the N.O.V.A. learning platform.
Your goal is to answer the student's question based strictly on the course materials provided below.

Instructions:
1. Ground your answer completely and only in the provided Context.
2. If the answer cannot be found or reasonably inferred from the Context, reply exactly with: "{escalation_flag_phrase}"
3. Do not make up facts, URLs, or hallucinate answers not supported by the context.
4. Keep your response clear, structured, and student-friendly.
5. Always cite the specific source URL, product name, and version if available in the context (e.g. "According to UiPath Studio 2023.10 documentation (https://docs.uipath.com/...)...").
6. Use the conversation history for continuity, but always prioritise the provided Context.

Context:
{context_text}
"""

        # ── Step 6: Call LLM (Nemotron → Groq → OpenRouter cascade) ──────────
        answer = ""
        messages = self._build_messages(system_prompt, chat_history, query)

        if self.use_nvidia and not answer:
            try:
                response = await self.nvidia_client.chat.completions.create(
                    model="nvidia/nemotron-3-ultra-550b-a55b",
                    messages=messages,
                    temperature=0.2,
                    max_tokens=1024,
                )
                answer = response.choices[0].message.content.strip()
            except Exception as e:
                print(f"[NOVA RAG] Nemotron failed: {e} — trying fallback")

        if self.use_groq and not answer:
            try:
                response = await self.groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=messages,
                    temperature=0.2,
                )
                answer = response.choices[0].message.content.strip()
            except Exception as e:
                print(f"[NOVA RAG] Groq failed: {e} — trying fallback")

        if self.use_openrouter and not answer:
            try:
                response = await self.openrouter_client.chat.completions.create(
                    model="meta-llama/llama-3.1-8b-instruct:free",
                    messages=messages,
                    temperature=0.2,
                    extra_headers={
                        "HTTP-Referer": "https://nova-platform.edu",
                        "X-Title": "N.O.V.A. Platform",
                    }
                )
                answer = response.choices[0].message.content.strip()
            except Exception as e:
                print(f"[NOVA RAG] OpenRouter failed: {e}")

        if not answer:
            return (
                "No LLM provider is currently available (Nemotron, Groq, and OpenRouter all failed). "
                "Please check your API keys in .env.docker.",
                0.0, True
            )

        # ── Step 7: Detect escalation phrase in LLM output ───────────────────
        should_escalate = False
        if escalation_flag_phrase in answer or "escalated this question" in answer.lower():
            should_escalate = True
            answer = escalation_flag_phrase

        # ── Step 8: Store answer in long-term memory for future cache hits ────
        if not should_escalate:
            try:
                await self.memory.store_long_term(
                    question=query,
                    answer=answer,
                    embedding=query_emb,
                    course_id=course_id,
                    confidence=best_score,
                    source="rag"
                )
            except Exception:
                pass  # Memory write failure is non-fatal

        return answer, best_score, should_escalate
