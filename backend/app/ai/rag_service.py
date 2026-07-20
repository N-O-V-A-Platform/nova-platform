import asyncio
from typing import List, Dict, Any, Tuple
from openai import AsyncOpenAI

from app.core.config import settings
from app.ai.embeddings import EmbeddingService
from app.ai.vector_store import PineconeVectorStore

class RAGService:
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.vector_store = PineconeVectorStore()
        
        self.use_groq = bool(settings.GROQ_API_KEY)
        self.use_openrouter = bool(settings.OPENROUTER_API_KEY)
        
        if self.use_groq:
            # Groq is OpenAI API compatible
            self.groq_client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1"
            )
        if self.use_openrouter:
            # OpenRouter is OpenAI API compatible
            self.openrouter_client = AsyncOpenAI(
                api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1"
            )

    async def get_response(
        self,
        query: str,
        course_id: str,
        namespace: str,
        chat_history: List[Dict[str, str]] = None,
        confidence_threshold: float = 0.65
    ) -> Tuple[str, float, bool]:
        """
        Executes the RAG pipeline.
        Returns:
            Tuple[answer_text, confidence_score, should_escalate]
        """
        if chat_history is None:
            chat_history = []

        # 1. Embed query (locally, deterministic, and free)
        try:
            query_emb = await self.embedding_service.get_embedding(query)
        except Exception as e:
            return f"Error creating query embedding: {str(e)}", 0.0, True

        # 2. Query Pinecone
        try:
            matches = await self.vector_store.query_chunks(
                query_embedding=query_emb,
                namespace=namespace,
                top_k=5
            )
        except Exception as e:
            # Fallback if vector store search fails
            return f"Error retrieving course materials context: {str(e)}", 0.0, True

        # 3. Assess confidence score from vector similarity
        best_score = 0.0
        context_chunks = []
        for m in matches:
            context_chunks.append(m["text"])
            if m["score"] > best_score:
                best_score = m["score"]

        # Default fallback string if no context matches
        escalation_flag_phrase = "I cannot find this information in the course materials. I have escalated this question to your lecturer."

        # If similarity score is below the threshold, automatically flag for escalation
        should_escalate = False
        if best_score < confidence_threshold:
            should_escalate = True
            return escalation_flag_phrase, best_score, should_escalate

        # 4. Formulate the LLM Prompt
        context_text = "\n---\n".join(context_chunks)
        
        system_prompt = f"""You are N.O.V.A., an AI educational assistant.
Your goal is to answer the student's question based strictly on the course materials provided in the Context section below.

Instructions:
1. Ground your answer completely and only in the provided Context.
2. If the answer cannot be found or reasonably inferred from the Context, reply exactly with: "{escalation_flag_phrase}"
3. Do not make up facts, URLs, or hallucinate answers that are not supported by the context.
4. Keep your response clear, structured, and easy to understand for a student.

Context:
{context_text}
"""

        # 5. Call LLM (Groq -> OpenRouter fallback cascade, Gemini & OpenAI removed)
        answer = ""
        
        if self.use_groq:
            try:
                # Format messages for Groq
                messages = [{"role": "system", "content": system_prompt}]
                for msg in chat_history:
                    role = "assistant" if msg["role"] == "assistant" else "user"
                    messages.append({"role": role, "content": msg["content"]})
                messages.append({"role": "user", "content": query})

                response = await self.groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=messages,
                    temperature=0.2
                )
                answer = response.choices[0].message.content.strip()
            except Exception as e:
                # Silently log and check fallback
                pass

        if not answer and self.use_openrouter:
            try:
                # Format messages for OpenRouter
                messages = [{"role": "system", "content": system_prompt}]
                for msg in chat_history:
                    role = "assistant" if msg["role"] == "assistant" else "user"
                    messages.append({"role": role, "content": msg["content"]})
                messages.append({"role": "user", "content": query})

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
                # Silently log
                pass

        if not answer:
            return "No active LLM provider (Groq or OpenRouter) is currently configured or available.", 0.0, True

        # Check if the LLM output matched our escalation phrase
        if escalation_flag_phrase in answer or "escalated this question" in answer.lower():
            should_escalate = True
            answer = escalation_flag_phrase

        return answer, best_score, should_escalate
