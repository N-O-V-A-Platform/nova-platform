# Test Cases

## 1. Authentication & Role-Based Access Control

### TC-AUTH-01: Student Access Limits
* **Objective:** Ensure student users cannot access lecturer-specific endpoints (e.g. uploading materials).
* **Steps:**
  1. Authenticate as a student.
  2. Attempt a `POST` request to `/api/v1/courses/:id/materials`.
* **Expected Result:** API returns `403 Forbidden`.

## 2. AI & RAG Escalation

### TC-RAG-01: Low Confidence Escalation
* **Objective:** Ensure questions with no matching material context are escalated to the lecturer.
* **Steps:**
  1. Post a query completely outside the course syllabus.
  2. Observe the generated response confidence metric.
* **Expected Result:** System generates a standard fallback response ("I don't have enough context...") and marks the question as escalated (`is_escalated = true`).
