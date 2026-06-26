# System Architecture

## 1. High-Level Architecture
Overview of the N.O.V.A. system architecture, including user interfaces, web/application servers, AI layer, automation hub, and data persistence layers.

## 2. Component Diagram
```mermaid
graph TD
    User([User: Student/Lecturer/Admin]) --> WebApp[Web Application - Frontend]
    WebApp --> API[Backend API Service]
    API --> DB[(Relational DB: PostgreSQL)]
    API --> VectorDB[(Vector DB: pgvector/Qdrant)]
    API --> AIOrch[AI Orchestration Layer - RAG]
    API --> Automation[Automation Hub - UiPath]
```
