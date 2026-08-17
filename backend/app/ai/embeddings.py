"""
Real semantic embedding service using sentence-transformers (local, free, no API key).

Model: all-MiniLM-L6-v2
- 384-dimensional dense vectors
- Excellent semantic similarity performance for English text
- Runs fully on CPU inside the Docker container
- ~90MB model download (cached after first run)
- No quota, no API key, no cost
"""

import asyncio
from functools import lru_cache
from typing import List


@lru_cache(maxsize=1)
def _load_model():
    """
    Lazily load the SentenceTransformer model once and cache it for the
    lifetime of the process. The @lru_cache ensures this is only called once
    even under concurrent async requests.
    """
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


class EmbeddingService:
    def __init__(self):
        pass

    async def get_embedding(self, text: str) -> List[float]:
        """
        Generate a real 384-dimensional semantic embedding vector for the given text.
        Uses sentence-transformers/all-MiniLM-L6-v2 running locally on CPU.

        Similar questions will produce similar (high cosine similarity) vectors,
        enabling the semantic memory cache to work correctly.
        """
        text = text.replace("\n", " ").strip()

        loop = asyncio.get_event_loop()
        vector = await loop.run_in_executor(
            None,
            lambda: _load_model().encode(text, normalize_embeddings=True).tolist()
        )
        return vector

    async def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Batch encode multiple texts efficiently in a single model pass.
        More efficient than calling get_embedding() in a loop.
        """
        cleaned = [t.replace("\n", " ").strip() for t in texts]

        loop = asyncio.get_event_loop()
        vectors = await loop.run_in_executor(
            None,
            lambda: _load_model().encode(cleaned, normalize_embeddings=True).tolist()
        )
        return vectors
