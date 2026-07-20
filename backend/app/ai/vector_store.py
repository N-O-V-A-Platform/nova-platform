import asyncio
from typing import List, Dict, Any
from pinecone import Pinecone, ServerlessSpec
from app.core.config import settings

class PineconeVectorStore:
    def __init__(self):
        self.api_key = settings.PINECONE_API_KEY
        self.index_name = "nova-index"
        self.pc = Pinecone(api_key=self.api_key) if self.api_key else None
        self._index = None

    def _get_index(self, dimension: int):
        if not self.pc:
            raise ValueError("PINECONE_API_KEY is not configured in settings.")
        if not self._index:
            try:
                # List existing indexes
                existing_indexes = [idx.name for idx in self.pc.list_indexes()]
                if self.index_name not in existing_indexes:
                    # Default serverless setup (AWS, us-east-1)
                    self.pc.create_index(
                        name=self.index_name,
                        dimension=dimension,
                        metric="cosine",
                        spec=ServerlessSpec(
                            cloud="aws",
                            region="us-east-1"
                        )
                    )
            except Exception as e:
                # Log warning but continue; index might already exist or list failed due to permissions
                print(f"Warning during Pinecone index initialization: {e}")
            
            self._index = self.pc.Index(self.index_name)
        return self._index

    async def upsert_chunks(
        self,
        resource_id: str,
        course_id: str,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
        namespace: str
    ) -> bool:
        """
        Asynchronously upsert document chunks and their embeddings into the Pinecone index.
        """
        if not self.pc:
            return False

        dimension = len(embeddings[0]) if embeddings else 1536
        index = self._get_index(dimension)

        vectors = []
        for i, chunk in enumerate(chunks):
            vectors.append({
                "id": f"{resource_id}_{chunk['chunk_index']}",
                "values": embeddings[i],
                "metadata": {
                    "resource_id": str(resource_id),
                    "course_id": str(course_id),
                    "text": chunk["text"],
                    "chunk_index": int(chunk["chunk_index"])
                }
            })

        # Run upsert in executor since pinecone-client is synchronous
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: index.upsert(vectors=vectors, namespace=namespace)
        )
        return True

    async def query_chunks(
        self,
        query_embedding: List[float],
        namespace: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Asynchronously query Pinecone index for top k nearest neighbors in a given namespace.
        """
        if not self.pc:
            return []

        dimension = len(query_embedding)
        index = self._get_index(dimension)

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: index.query(
                namespace=namespace,
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True
            )
        )

        results = []
        for match in response.get("matches", []):
            metadata = match.get("metadata", {})
            results.append({
                "id": match.get("id"),
                "score": match.get("score"),
                "text": metadata.get("text", ""),
                "resource_id": metadata.get("resource_id", ""),
                "course_id": metadata.get("course_id", ""),
                "chunk_index": metadata.get("chunk_index", 0)
            })
        return results

    async def delete_resource_chunks(self, resource_id: str, namespace: str) -> bool:
        """
        Asynchronously deletes all vector chunks of a specific resource.
        """
        if not self.pc:
            return False

        # Get index with default dimension
        index = self._get_index(1536)

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: index.delete(
                filter={"resource_id": {"$eq": str(resource_id)}},
                namespace=namespace
            )
        )
        return True
