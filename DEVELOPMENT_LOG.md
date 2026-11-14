# N.O.V.A. Technical Development & Architectural Decision Log

**Project Name:** N.O.V.A. (Next-gen Optimized Virtual Assistant)  
**Main Repository:** `nova-platform`  
**Current Milestone:** Adaptive Learning Intelligence Transformation (Sprint 2.0)  
**Last Updated:** November 14, 2026  

---

## 1. Architectural History & Milestones

### Milestone 1: The Multi-Agent Chatbot Chassis (Completed)
* **FastAPI Async Lifespan**: Integrated asynchronous initialization with `asyncpg` and SQLAlchemy 2.0. Pre-warmed `all-MiniLM-L6-v2` dense embeddings into RAM on boot to eliminate first-token cold start latency (<50ms query embedding generation).
* **Redis Semantic Cosine Caching**: Configured cosine distance caching threshold ($\ge 0.88$). Sub-10ms response delivery on identical/rephrased student queries with $0 token cost.
* **Pinecone Multi-Tenant Namespaces**: Isolated institutional courses into distinct vector namespaces (`course_{uuid}`) and created a curated background scraper for UiPath global documentation.
* **Cascading LLM Inference Mesh**: Built prioritized client fallback: NVIDIA Nemotron-3 550B $\rightarrow$ Groq Llama 3.1 8B $\rightarrow$ OpenRouter $\rightarrow$ OpenAI/Gemini to handle HTTP 429 rate-limiting.

---

### Milestone 2: Transition to Adaptive Learning Intelligence (Active Sprint)

#### 1. The Learner Knowledge Graph (LKG) Layer
* **Rationale:** Moving beyond flat chat history. An LLM cannot judge whether a student is ready for a complex concept without an explicit topological model of syllabus dependencies.
* **Backend Models Added** (`app/models/knowledge_graph.py`):
  * `CourseConcept`: Nodes representing atomic syllabus concepts with `difficulty_tier` and `syllabus_week`.
  * `ConceptDependency`: Directed edges representing prerequisite constraints with confidence weighting.
  * `StudentKnowledgeState`: Persistent student mastery records tracking lifecycle states (`unseen` $\rightarrow$ `introduced` $\rightarrow$ `practicing` $\rightarrow$ `mastered` $\rightarrow$ `needs_revision`), confidence score ($0.0 - 1.0$), consecutive correct streaks, and active misconceptions.
* **Database Migration**: Created Alembic migration script `f8a1b2c3d4e5_add_knowledge_graph_tables.py` linking directly to `d4e5f6a7b8c9`.
* **API Endpoints** (`app/api/v1/knowledge_graph.py`):
  * `GET /api/v1/knowledge-graph/course/{id}`: Returns complete topological graph with student mastery overlay.
  * `POST /api/v1/knowledge-graph/concepts`: Allows faculty to create atomic syllabus nodes.
  * `POST /api/v1/knowledge-graph/dependencies`: Defines directed prerequisite edges.
  * `GET /api/v1/knowledge-graph/check-prerequisites/{concept_id}`: Evaluates prerequisite compliance before teaching advanced topics.

#### 2. Socratic Misconception Loop & State Synchronization
* **Rationale:** When students answer formative check questions during Socratic lessons, the result must actively feed back into the Knowledge Graph rather than disappearing in the chat stream.
* **Implementation** (`app/api/v1/ai_teacher.py`):
  * Hooked `submit_student_response` directly to `KnowledgeGraphService.record_evaluation_outcome`.
  * Automatically increments consecutive correct streaks, updates confidence score (+0.15 on correct, -0.20 on incorrect), transitions mastery states, and attaches/clears misconception tags.

#### 3. Dynamic Blackboard 2.0 (Interactive Manipulables)
* **Rationale:** Static diagrams fail to communicate mathematical intuition. Asking an LLM to generate raw JavaScript code leads to syntax errors and security vulnerabilities.
* **Frontend Implementation**:
  * Created `InteractiveManipulable.tsx` with dynamic SVG coordinate planes, reactive slider controls, and real-time residual recalculation.
  * Integrated directly into `SVGBlackboard.tsx` to conditionally mount interactive widgets whenever `canvas_type === "interactive_manipulable"`.
  * Verified with Next.js Turbopack production build (22/22 routes compiling with 0 errors).

---

## 2. File Index & Directory Structure

```
nova-platform/
├── backend/
│   ├── alembic/versions/
│   │   ├── d4e5f6a7b8c9_add_ai_teacher_tables.py
│   │   └── f8a1b2c3d4e5_add_knowledge_graph_tables.py     <-- Knowledge Graph migration
│   ├── app/
│   │   ├── ai/
│   │   │   ├── knowledge_graph_service.py                <-- Graph service & prerequisite gating
│   │   │   ├── teacher_agent.py                          <-- 6-stage Socratic engine
│   │   │   └── vector_store.py                           <-- Pinecone vector namespaces
│   │   ├── api/v1/
│   │   │   ├── ai_teacher.py                             <-- Lesson studio & Socratic feedback
│   │   │   ├── knowledge_graph.py                        <-- LKG endpoints
│   │   │   └── router.py                                 <-- FastAPI v1 router
│   │   ├── models/
│   │   │   ├── ai_teacher.py                             <-- Socratic session models
│   │   │   └── knowledge_graph.py                        <-- Concept & mastery models
│   │   └── schemas/
│   │       └── knowledge_graph.py                        <-- Pydantic typed schemas
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── InteractiveManipulable.tsx                <-- Interactive sliders & coordinate sandbox
│   │   │   └── SVGBlackboard.tsx                         <-- Chalkboard canvas & SVG engine
│   │   ├── lecturer/
│   │   │   └── analytics/page.tsx                        <-- Cohort telemetry & heatmaps
│   │   └── student/
│   │       ├── ai-teacher/page.tsx                       <-- AI Teacher studio
│   │       └── uipath/page.tsx                           <-- Skill passport & XP ledger
├── ADAPTIVE_INTELLIGENCE_BLUEPRINT.md                    <-- Core architectural vision
├── PROJECT_INFO.md                                       <-- DPR & implementation roadmap
├── SYSTEM_DESIGN.md                                      <-- Technical interview & viva defense guide
└── DEVELOPMENT_LOG.md                                    <-- This file (build and decision history)
```

- **Google OAuth UI Polish**: Updated `GoogleAuthButton.tsx` so that when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is unset (local dev mode), it gracefully hides itself instead of showing an intrusive red error banner.
