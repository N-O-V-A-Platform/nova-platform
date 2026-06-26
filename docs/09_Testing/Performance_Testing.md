# Performance Testing

## 1. Objectives
Validate system performance under heavy load, specifically measuring response latencies for API endpoints, concurrent WebSocket connections, and RAG retrieval pipelines.

## 2. Target Performance Benchmarks
* **API Endpoints:** 95% of read requests resolved in <200ms.
* **WebSocket Ingestion:** Message broadcast delivery under <50ms.
* **RAG Pipeline Latency:**
  * Time to First Token (TTFT) <500ms.
  * Complete response generation <3000ms.
* **Concurrent Capacity:** Support up to 500 simultaneous users per department node.
