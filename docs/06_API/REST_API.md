# REST API Documentation

## 1. Authentication
All API requests (except login/register) require a Bearer token in the `Authorization` header.

## 2. Key Endpoints

### User & Course Management
* `GET /api/v1/courses` - List enrolled/taught courses.
* `GET /api/v1/courses/:id/materials` - List course materials.
* `POST /api/v1/courses/:id/materials` - Upload course materials (Lecturer only).

### Learning Assistant (QA & Chat)
* `POST /api/v1/chat` - Submit query to RAG assistant.
* `GET /api/v1/chat/history` - Retrieve student's session history.

### Automation / Escalation
* `POST /api/v1/questions/:id/escalate` - Manually or automatically escalate question to lecturer.
