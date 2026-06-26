# Retrieval-Augmented Generation (RAG) Architecture

## 1. Document Ingestion Pipeline
Processes uploaded lecturer materials (PDFs, PPTX, recordings) into clean, chunked embeddings.

## 2. Ingestion Flow
1. **Document Loading:** Parse uploaded files.
2. **Text Chunking:** Semantic chunking or recursive character splitting.
3. **Embedding Generation:** Create vector representations using an embedding model (e.g., text-embedding-3-small).
4. **Vector Indexing:** Store chunks with metadata (course ID, lecturer ID, page number) in the vector database.

## 3. Query & Retrieval Flow
1. **Query Rewriting:** Rephrase the query based on chat history.
2. **Semantic Search:** Query vector database for similar chunks matching current course/lecturer metadata.
3. **Re-ranking:** Apply cross-encoder models to rank top retrieved chunks.
4. **Generation:** Construct prompt with retrieved context and generate response using LLM.
5. **Confidence Score Calculation:** Calculate confidence metrics to determine if the query should be escalated.
