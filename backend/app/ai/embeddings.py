class EmbeddingService:
    def __init__(self):
        # Gemini and OpenAI are disabled per request
        pass

    async def get_embedding(self, text: str) -> list[float]:
        """
        Generates a deterministic 1536-dimensional mock embedding vector based on text hashing.
        This provides a completely local, fast, and free embedding service without API keys.
        """
        import hashlib
        import random

        # Clean text
        text = text.replace("\n", " ").strip()

        # Seed random generator with the text's SHA256 hash to keep it deterministic
        seed = int(hashlib.sha256(text.encode('utf-8')).hexdigest(), 16) % (10 ** 8)
        rng = random.Random(seed)

        # Generate 1536 float values
        vector = [rng.uniform(-0.1, 0.1) for _ in range(1536)]

        # Normalize the vector (so cosine similarity queries behave correctly in Pinecone)
        magnitude = sum(x * x for x in vector) ** 0.5
        if magnitude > 0:
            vector = [x / magnitude for x in vector]

        return vector
