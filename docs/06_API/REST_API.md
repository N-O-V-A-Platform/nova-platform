# REST API Specification

---

# 1. Introduction

## 1.1 Purpose

This document defines the REST API endpoints exposed by the N.O.V.A. platform. It specifies endpoint organization, HTTP methods, authentication requirements, request parameters, response formats, and error handling conventions.

The REST API serves as the primary communication interface between frontend clients and backend services.

---

# 2. API Base URL

Development

```
http://localhost:8000/api/v1
```

Production

```
https://api.nova.edu/api/v1
```

---

# 3. Authentication

Protected endpoints require JWT authentication.

Header format:

```http
Authorization: Bearer <access_token>
```

---

# 4. Standard Response Format

Successful response

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

Error response

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": []
}
```

---

# 5. Authentication API

## Login

```
POST /auth/login
```

Request

```json
{
  "email": "student@example.com",
  "password": "********"
}
```

Response

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": {}
}
```

---

## Register

```
POST /auth/register
```

---

## Logout

```
POST /auth/logout
```

---

## Refresh Token

```
POST /auth/refresh
```

Request body:

```json
{
  "refresh_token": "<NOVA_REFRESH_TOKEN>"
}
```

Returns a new access token and rotated refresh token for active users.

---

## Google OAuth Login

```
POST /auth/google
```

Request body:

```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

The backend verifies this Google ID token against `GOOGLE_CLIENT_ID` before
creating or logging in a N.O.V.A user.

Role rules:

* Emails listed in `ADMIN_EMAILS` are promoted to Admin after verified auth.
* Google users are created as Students by default unless their email is an admin email.
* Lecturer accounts must be approved by an Admin before they can log in.

---

# 6. User API

## Get Current User

```
GET /users/me
```

---

## Update Profile

```
PUT /users/me
```

---

## Change Password

```
PUT /users/change-password
```

## Request Lecturer Approval

```
POST /users/request-lecturer-role
Authorization: Bearer <NOVA_JWT>
```

Moves the current Student account into `Pending Approval` as a Lecturer. An
Admin must approve the request before the account can log in as a Lecturer.

---

# 7. Admin API

All Admin endpoints require a bearer token for an active Admin user.

## Pending Lecturer Requests

```
GET /admin/pending-lecturers?limit=100&offset=0
Authorization: Bearer <NOVA_JWT>
```

## Approve Lecturer

```
POST /admin/approve-lecturer/{user_id}
Authorization: Bearer <NOVA_JWT>
```

## Reject Lecturer

```
POST /admin/reject-lecturer/{user_id}
Authorization: Bearer <NOVA_JWT>
```

---

# 7. Course API

## Get Courses

```
GET /courses
```

---

## Get Course

```
GET /courses/{course_id}
```

---

## Create Course

```
POST /courses
```

---

## Update Course

```
PUT /courses/{course_id}
```

---

## Delete Course

```
DELETE /courses/{course_id}
```

---

# 8. Lecture API

## Get Lectures

```
GET /lectures
```

---

## Create Lecture

```
POST /lectures
```

---

## Update Lecture

```
PUT /lectures/{lecture_id}
```

---

## Delete Lecture

```
DELETE /lectures/{lecture_id}
```

---

# 9. Resource API

## Upload Resource

```
POST /resources/upload
```

---

## List Resources

```
GET /resources
```

---

## Download Resource

```
GET /resources/{resource_id}
```

---

## Delete Resource

```
DELETE /resources/{resource_id}
```

---

# 10. AI API

## Academic Chat

```
POST /ai/chat
```

---

## Generate Quiz

```
POST /ai/quiz
```

---

## Learning Recommendation

```
POST /ai/recommendations
```

---

## AI Conversation History

```
GET /ai/conversations
```

---

## Escalate Question

```
POST /ai/escalate
```

---

# 11. Quiz API

## Create Quiz

```
POST /quizzes
```

---

## Get Quiz

```
GET /quizzes/{quiz_id}
```

---

## Submit Quiz

```
POST /quizzes/{quiz_id}/submit
```

---

## Quiz Results

```
GET /quizzes/{quiz_id}/results
```

---

# 12. Certificate API

## Get Certificates

```
GET /certificates
```

---

## Upload Certificate

```
POST /certificates
```

---

## Verify Certificate

```
POST /certificates/{certificate_id}/verify
```

---

# 13. Portfolio API

## Get Portfolio

```
GET /portfolio
```

---

## Update Portfolio

```
PUT /portfolio
```

---

## Export Resume

```
GET /portfolio/resume
```

---

# 14. Workflow API

## Get Workflows

```
GET /workflows
```

---

## Create Workflow

```
POST /workflows
```

---

## Execute Workflow

```
POST /workflows/{workflow_id}/execute
```

---

# 15. Notification API

## Get Notifications

```
GET /notifications
```

---

## Mark as Read

```
PUT /notifications/{notification_id}/read
```

---

# 16. Analytics API

## Student Analytics

```
GET /analytics/student
```

---

## Lecturer Analytics

```
GET /analytics/lecturer
```

---

## Institution Analytics

```
GET /analytics/institution
```

---

# 17. HTTP Status Codes

| Code | Description           |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 204  | No Content            |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 409  | Conflict              |
| 422  | Validation Error      |
| 429  | Too Many Requests     |
| 500  | Internal Server Error |

---

# 18. API Versioning

The API uses URI versioning.

Example:

```
/api/v1/...
```

Future versions shall maintain backward compatibility where feasible.

---

# 19. Rate Limiting

Rate limiting policies include:

* Authentication endpoints
* AI endpoints
* Resource uploads
* Workflow execution

Limits may vary based on user role and subscription level.

---

# 20. Future API Extensions

Future endpoints may include:

* GraphQL Gateway
* Public Developer API
* AI Streaming API
* LMS Integration API
* Employer API
* Mobile API
* Webhooks
