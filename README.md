# N.O.V.A. - Next-Gen Multi-Agent AI Academic & Virtual Teaching Swarm

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Pinecone](https://img.shields.io/badge/Pinecone-Vector_DB-000000?logo=pinecone&logoColor=white)](https://www.pinecone.io)
[![UiPath](https://img.shields.io/badge/UiPath-RPA_Automation-FA4616?logo=uipath&logoColor=white)](https://www.uipath.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**N.O.V.A.** (**N**ext-gen **O**ptimized **V**irtual **A**ssistant) is an enterprise-grade, autonomous multi-agent academic intelligence and virtual teaching platform. Built on an asynchronous agent swarm architecture with cascading LLM mesh providers and agentic RAG, it orchestrates specialized AI nodes to deliver adaptive course lectures, generate interactive live SVG blackboard visuals, synthesize multi-lingual voice instruction, diagnose student misconceptions via Socratic loops, automate administrative workflows via UiPath Robotic Process Automation (RPA), and seamlessly escalate uncertain queries to faculty with human-in-the-loop precision.

> **Motto:** *No Question Left Behind.*  
> **Tagline:** *Beyond Scores. Towards Understanding.*

---

## System Architecture and Workflow

```
[STUDENT QUERY / LESSON SESSION]
                 │
                 ▼
 ┌───────────────────────────────┐      Extracts Intent, Topic Domain, & Student Level
 │      Intent Router Agent      ├─────────────────────────────────────────────────┐
 └───────────────┬───────────────┘                                                 │
                 │ (Course Context Isolated)                                       │
                 ▼                                                                 │
 ┌───────────────────────────────┐                                                 │
 │      Redis Semantic Cache     │ ◄─── Semantic Cosine Check (Threshold ≥ 0.88)   │
 └───────────────┬───────────────┘                                                 │
                 │                                                                 │
        ┌────────┴────────┐                                                        │
        │   Cache Hit?    │                                                        │
        ├────────┬────────┤                                                        │
        │ Yes    │ No     │                                                        │
        ▼        ▼        ▼                                                        │
 ┌─────────────┐ ┌───────────────┐                                                 │
 │ Fast Return │ │   RAG Agent   │ ◄─── Pinecone Vector Search                     │
 │ Zero-Token  │ │  (Embeddings) │      (Syllabus & Lecture Notes Chunks)          │
 │ Cache Match │ └───────┬───────┘                                                 │
 └─────────────┘         │                                                         │
                         ▼                                                         ▼
                 ┌───────────────┐      Cascading LLM Mesh:                 ┌──────────────┐
                 │  A.I. Teacher │ ◄─── NVIDIA Nemotron / Groq Llama /      │  UiPath RPA  │
                 │     Agent     │      OpenRouter / OpenAI                 │  Automation  │
                 └───────┬───────┘                                          └──────┬───────┘
                         │                                                         │
                         ▼                                                         │ (Cert Verification &
                 ┌───────────────┐                                                 │  Skill Passport XP)
                 │ Misconception │ ◄─── Diagnoses student reasoning flaws          │
                 │   Evaluator   │      & shifts pedagogical strategy              │
                 └───────┬───────┘                                                 │
                         │                                                         │
           ┌─────────────┴─────────────┐                                           │
           │    Is confidence ≥ 85%?   │                                           │
           ├─────────────┬─────────────┤                                           │
           │ Yes         │ No          │                                           │
           ▼             ▼             ▼                                           │
   ┌──────────────┐     ┌──────────────┐                                           │
   │  Resolution  │     │   Lecturer   │ ◄─── Human-in-the-Loop                    │
   │   Response   │     │  Escalation  │      One-Click Review & Annotation        │
   │  + Live SVG  │     │    Agent     │                                           │
   │  Blackboard  │     └──────┬───────┘                                           │
   └──────┬───────┘            │                                                   │
          │                    ▼                                                   │
          │             ┌──────────────┐                                           │
          │             │   Approved   │ (Context ingested back into               │
          │             │  Knowledge   │  institutional vector memory)             │
          │             └──────┬───────┘                                           │
          │                    │                                                   │
          ▼◄───────────────────┘                                                   │
   ┌──────────────┐                                                                │
   │  TTS Avatar  │ ◄──────────────────────────────────────────────────────────────┘
   │ Multi-Modal  │ (Generates lip-synced audio, interactive SVG,
   │  Experience  │  awards Skill XP, and logs telemetry)
   └──────────────┘
```

---

## Technical Features

### 1. Collaborative Multi-Agent Teaching Swarm
Our modular multi-agent plexus orchestrates specialized nodes for instruction, retrieval, and mitigation:
- **Intent Router Agent**: Parses incoming learner prompts, classifies academic vs. administrative intent, isolates course domains, and routes queries to targeted agent pipelines (Lesson Planner, Assessment, or Automation).
- **Agentic RAG Retrieval Agent**: Executes sub-50ms vector queries against Pinecone index namespaces, retrieving lecturer-approved slide decks, textbooks, and notes while enforcing strict citation grounding.
- **Adaptive AI Teacher Agent**: Formulates dynamic 5-7 step interactive lesson plans, generates real-time pedagogical scripts, and adapts explanations based on student comprehension tiers.
- **Misconception Evaluator Loop**: Diagnoses root cognitive flaws in student responses, dynamically pivoting across pedagogical techniques (Socratic Questioning, Analogies, First Principles) rather than simply regurgitating correct answers.
- **Confidence Evaluation & Hallucination Guard**: Computes multidimensional trust scores based on semantic relevance, source coverage, and model certainty. Queries scoring below 85% are intercepted to prevent hallucination.
- **Human-in-the-Loop (HITL) Lecturer Escalation Agent**: Dispatches flagged queries with conversation traces and retrieved context to the educator's dashboard for review, subsequently re-indexing educator approvals into the knowledge base.
- **UiPath RPA Automation Agent**: Bridges AI insights with institutional workflows, automating certificate authenticity checks, course record synchronization, and student passport minting.

### 2. Dynamic SVG Vector Blackboard & Interactive Lesson Scripting
An interactive visual learning canvas replaces static markdown text:
- **Dynamic SVG Blackboard Generation**: The AI Teacher agent writes and renders live vector graphics, mathematical formulas, state machine transitions, and architectural diagrams directly on a synchronized virtual board.
- **Step-by-Step Pedagogical Sections**: Lessons are partitioned into digestible, step-indexed modules with guided checkpoints, formative quizzes, and active recall triggers.
- **Real-Time Visual State Updates**: Visual diagrams adapt dynamically based on learner answers, visually illustrating code execution paths or data flow transformations.

### 3. Multi-Persona Audio & Synced Mascot Engine
A rich, hands-free conversational learning experience driven by modern speech APIs:
- **Persona Presets**: Features **Dr. Nova** (Warm, encouraging female voice) and **Prof. Orion** (Authoritative, structured male voice) tailored to diverse learning styles.
- **Multilingual TTS Synthesis**: Supports natural English, Hindi, and Hinglish speech synthesis powered by Microsoft Edge-TTS and Google Cloud TTS with intelligent fallback to browser Web Speech API.
- **Synchronized Mascot Lip-Sync & State Engine**: Features an animated interactive mascot that transitions fluidly across idle, thinking, explaining, and celebratory states in lockstep with audio playback.

### 4. Cascading LLM Mesh & Zero-Latency Redis Semantic Memory
High availability and ultra-low latency powered by an intelligent inference cascade:
- **Resilient Model Cascade**: Seamlessly falls back across high-performance LLM backends: NVIDIA Nemotron-3 Ultra 550B (NIM API) &rarr; Groq Llama-3.1-8B-Instant &rarr; OpenRouter Meta-Llama-3.1 &rarr; OpenAI / Gemini.
- **Long-Term Semantic Cache**: Employs Redis vector similarity caching (cosine threshold &ge; 0.88) to intercept repeated or rephrased queries across classes, delivering sub-10ms responses with **0 token cost**.
- **Pre-Warmed Embedding Infrastructure**: Sentence-Transformers models are asynchronously pre-warmed into RAM on ASGI lifespan startup, ensuring zero cold-start latency for all vector operations.

### 5. UiPath RPA Integration & Gamified Skill Passport
Institutional-grade automation meets verifiable student credentialing:
- **Automated Certificate Validation**: UiPath background worker threads scrape, verify, and validate completed external credentials (e.g. UiPath Academy, academic certifications).
- **Verifiable Skill Passport**: A centralized digital ledger compiling verified student competencies, project badges, and course proficiencies for academic and industry recruiters.
- **Gamified Progression Engine**: Awards experience points (XP), ranks students across real-time campus leaderboards, and unlocks achievement badges across 10+ core CS curricula tracks.

### 6. Enterprise Multi-Tenant Architecture & Role-Based Portals
Engineered as a clean Modular Monolith with strict logical separation:
- **Student Command Center**: Course discovery, conversational AI teacher, interactive RAG chats, leaderboards, and skill passport.
- **Lecturer Operations Portal**: Course curriculum management, document upload and Pinecone vector indexing, student telemetry, and one-click escalation triage.
- **Institutional Admin Console**: Multi-tenant institutional provisioning, role approvals, audit logging, and global system health telemetry.

---

## Simulated Learning & Outage Workflows

N.O.V.A. demonstrates agent reasoning depth across real-world classroom situations:

1. **`MISCONCEPTION_RECURSION_INFINITE_LOOP` (Severity: HIGH)**: A student implements a recursive factorial without an exit condition. Rather than printing a raw stack overflow error, the Misconception Engine isolates the missing base condition, suppresses compiler panic, and renders an interactive SVG call-stack diagram using Socratic inquiry.
2. **`RAG_OUT_OF_SYLLABUS_ESCALATION` (Severity: MEDIUM)**: A student queries quantum computing algorithms during a classical Data Structures lecture. The Confidence Evaluator calculates a 42% relevance score against course syllabus chunks and automatically dispatches a flagged escalation card to the Lecturer's review queue.
3. **`SEMANTIC_CACHE_BURST_PRE_EXAM` (Severity: CRITICAL LOAD)**: 120 concurrent students ask *"What is the time complexity of QuickSort in the worst case?"* minutes before an exam. The Redis Semantic Cache achieves a 99.2% hit rate, serving instantaneous sub-10ms responses without consuming external LLM quota.
4. **`UIPATH_ACADEMY_CREDENTIAL_VERIFICATION` (Severity: NORMAL)**: A student uploads a UiPath Automation Developer diploma. The Automation Agent triggers background scraping/validation workers, confirms credential hashes, awards the *"Automation Pioneer"* badge, and mints verified Skill Passport records.
5. **`HALLUCINATION_GUARD_INTERCEPTION` (Severity: HIGH)**: An ambiguous student prompt triggers conflicting external derivations. The hallucination guardrail intercepts generation, cross-references lecturer-approved slide embeddings, and grounds the final response with verified slide and page citations.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | [Next.js 15](https://nextjs.org) (App Router), [React 19](https://react.dev), [TypeScript 5.9](https://www.typescriptlang.org), [Tailwind CSS](https://tailwindcss.com), [Lucide React](https://lucide.dev) |
| **Backend API** | [FastAPI](https://fastapi.tiangolo.com) (Python 3.10+), [Pydantic v2](https://docs.pydantic.dev), [Uvicorn](https://www.uvicorn.org) (ASGI), [Alembic](https://alembic.sqlalchemy.org) |
| **Database & Cache** | [PostgreSQL 15](https://www.postgresql.org), [SQLAlchemy 2.0](https://www.sqlalchemy.org) (`asyncpg`), [Redis 7](https://redis.io) (Semantic Memory & Rate Limiting) |
| **AI & Vector Store** | [Pinecone](https://www.pinecone.io) Vector DB, [Sentence-Transformers](https://sbert.net), NVIDIA NIM, Groq, OpenRouter, OpenAI, Gemini |
| **Audio & Speech** | Microsoft Edge-TTS, Google Cloud TTS, Web Speech API, Web Audio API |
| **Automation & RPA** | [UiPath](https://www.uipath.com) Orchestrator / Academy Integration, APScheduler Background Workers, BeautifulSoup4 |
| **DevOps & Containerization** | Docker, Docker Compose, Nginx, GitHub Actions |

---

## Quickstart Guide

To boot up the N.O.V.A. Platform in your local development environment:

### Option 1: Docker Compose (Recommended)
Launch the entire multi-container ecosystem with a single command:
```bash
docker compose up --build
```

*Services will be provisioned:*
- **Frontend Dashboard**: `http://localhost:3000`
- **FastAPI API & Docs**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432`
- **Redis Cache**: `localhost:6379`

---

### Option 2: Manual Local Setup

#### 1. Launch the FastAPI Backend
Initialize the virtual environment, install dependencies, run migrations, and start Uvicorn:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements/local.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*The API server will start on `http://localhost:8000` with interactive Swagger docs at `/docs`.*

#### 2. Launch the Next.js Frontend
Install npm dependencies and spin up the development server:
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
*The web interface will be served on `http://localhost:3000`.*

---

## Environment Configuration

Configure external API keys in `backend/.env` for full multi-agent capabilities:

```env
# Application Settings
APP_NAME=N.O.V.A API
APP_VERSION=1.0.0
DEBUG=True
API_V1_STR=/api/v1
BACKEND_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_URL=http://localhost:3000

# Security & Admin
JWT_SECRET_KEY=generate-with-openssl-rand-hex-32
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ADMIN_EMAILS=arjunr252005@gmail.com

# Database & Cache
DATABASE_URL=postgresql+asyncpg://nova_user:nova_password@localhost:5432/nova_db
REDIS_URL=redis://localhost:6379/0

# External AI Provider Keys (Cascading Priority)
NVIDIA_API_KEY=nvapi-...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# Vector Database (RAG)
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=nova-knowledge-base

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## Repository Structure

```
nova-platform/
├── backend/                  # FastAPI Asynchronous REST API
│   ├── alembic/              # Database migration schemas
│   ├── app/
│   │   ├── ai/               # AI Agents: Teacher, RAG, Embeddings, Memory, TTS
│   │   ├── api/              # API endpoints: Auth, Courses, Chats, UiPath, Admin
│   │   ├── auth/             # JWT, OAuth 2.0, & security handlers
│   │   ├── core/             # Configuration, logging, & email dispatch
│   │   ├── db/               # SQLAlchemy 2.0 async sessions & base models
│   │   ├── models/           # Domain schemas: User, Course, Resource, Quiz, Skills
│   │   ├── schemas/          # Pydantic validation models
│   │   └── workers/          # Background scrapers & RPA tasks
│   ├── requirements/         # Base & local dependency sets
│   └── Dockerfile            # Optimized Python 3.10 ASGI container
├── frontend/                 # Next.js 15 App Router Web Application
│   ├── app/                  # App routes: /student, /lecturer, /admin, /onboarding
│   ├── components/           # UI components, Mascot, Audio player, SVG Blackboard
│   ├── context/              # Global React contexts (AuthContext, Theme)
│   ├── services/             # Client-side API fetch clients
│   └── Dockerfile            # Containerized Node.js frontend runner
├── docs/                     # Comprehensive Architecture, PRD, & SRS Documents
│   ├── 01_Product/           # Vision & PRD
│   ├── 04_Architecture/      # System, AI, RAG, & Security architecture
│   └── 07_UI_UX/             # Design systems & wireframes
├── docker-compose.yml        # Orchestration: PostgreSQL, Redis, Backend, Frontend
└── LICENSE                   # MIT Open Source License
```

---

## Authorship and Credits

Developed and maintained by **Arjun R** and **Team N.O.V.A.**.

* **Motto:** *No Question Left Behind.*
* **Tagline:** *Beyond Scores. Towards Understanding.*
