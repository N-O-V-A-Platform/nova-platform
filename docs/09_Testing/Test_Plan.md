# Test Plan

## 1. Scope of Testing
Comprehensive testing protocol verifying N.O.V.A. system reliability, AI RAG correctness, security configurations, and live classroom communication.

## 2. Testing Levels
* **Unit Testing:** Isolated logic validation (helpers, authentication validation, utility functions).
* **Integration Testing:** API request/response integrity, database interactions, vector search operations.
* **System/E2E Testing:** Whole-workflow validation (student logs in, asks a question, gets answer/gets escalated, lecturer resolves escalation).
* **RAG Evaluator Testing:** Computing performance metrics (prefill latency, TTFT, correctness, grounding context overlap).
