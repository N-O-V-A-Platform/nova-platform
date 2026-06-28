# Data Dictionary

---

# 1. Introduction

## 1.1 Purpose

This document defines the data dictionary for the N.O.V.A. platform. It provides standardized definitions for database entities, attributes, data types, constraints, and descriptions.

The data dictionary serves as the authoritative reference for developers, database administrators, testers, and API designers.

---

# 2. Naming Standards

The database follows these conventions:

* Table names use Singular Case.
* Column names use snake_case.
* Primary keys are UUIDs named `id`.
* Foreign keys follow `<entity>_id`.
* Timestamp fields use `created_at` and `updated_at`.

---

# 3. Data Types

| Type      | Description                   |
| --------- | ----------------------------- |
| UUID      | Universally Unique Identifier |
| VARCHAR   | Variable-length text          |
| TEXT      | Long text                     |
| INTEGER   | Whole numbers                 |
| DECIMAL   | Decimal values                |
| BOOLEAN   | True/False                    |
| DATE      | Calendar date                 |
| TIMESTAMP | Date and time                 |
| JSONB     | Structured JSON document      |

---

# 4. Entity Definitions

---

## Institution

| Field      | Type         | Description                   |
| ---------- | ------------ | ----------------------------- |
| id         | UUID         | Unique institution identifier |
| name       | VARCHAR(255) | Institution name              |
| code       | VARCHAR(50)  | Institution code              |
| address    | TEXT         | Institution address           |
| created_at | TIMESTAMP    | Record creation time          |
| updated_at | TIMESTAMP    | Last modification time        |

---

## Department

| Field          | Type         | Description           |
| -------------- | ------------ | --------------------- |
| id             | UUID         | Department identifier |
| institution_id | UUID         | Parent institution    |
| name           | VARCHAR(255) | Department name       |
| code           | VARCHAR(50)  | Department code       |

---

## User

| Field          | Type         | Description             |
| -------------- | ------------ | ----------------------- |
| id             | UUID         | Unique user identifier  |
| institution_id | UUID         | Institution affiliation |
| role_id        | UUID         | Assigned role           |
| first_name     | VARCHAR(100) | First name              |
| last_name      | VARCHAR(100) | Last name               |
| email          | VARCHAR(255) | Login email             |
| password_hash  | TEXT         | Encrypted password      |
| status         | VARCHAR(20)  | Account status          |
| created_at     | TIMESTAMP    | Account creation        |
| updated_at     | TIMESTAMP    | Last update             |

---

## Role

| Field       | Type         | Description      |
| ----------- | ------------ | ---------------- |
| id          | UUID         | Role identifier  |
| name        | VARCHAR(100) | Role name        |
| description | TEXT         | Role description |

---

## Permission

| Field           | Type         | Description           |
| --------------- | ------------ | --------------------- |
| id              | UUID         | Permission identifier |
| role_id         | UUID         | Parent role           |
| permission_name | VARCHAR(150) | Permission label      |

---

## Course

| Field         | Type         | Description       |
| ------------- | ------------ | ----------------- |
| id            | UUID         | Course identifier |
| department_id | UUID         | Parent department |
| lecturer_id   | UUID         | Assigned lecturer |
| title         | VARCHAR(255) | Course title      |
| code          | VARCHAR(50)  | Course code       |
| semester      | INTEGER      | Academic semester |
| credits       | INTEGER      | Credit value      |

---

## Enrollment

| Field       | Type      | Description           |
| ----------- | --------- | --------------------- |
| id          | UUID      | Enrollment identifier |
| student_id  | UUID      | Student               |
| course_id   | UUID      | Course                |
| enrolled_at | TIMESTAMP | Enrollment date       |

---

## Lecture

| Field        | Type         | Description        |
| ------------ | ------------ | ------------------ |
| id           | UUID         | Lecture identifier |
| course_id    | UUID         | Parent course      |
| topic        | VARCHAR(255) | Lecture topic      |
| lecture_date | DATE         | Lecture date       |
| duration     | INTEGER      | Duration (minutes) |

---

## Resource

| Field       | Type         | Description          |
| ----------- | ------------ | -------------------- |
| id          | UUID         | Resource identifier  |
| course_id   | UUID         | Related course       |
| lecture_id  | UUID         | Related lecture      |
| file_name   | VARCHAR(255) | Resource name        |
| file_type   | VARCHAR(50)  | PDF, PPT, DOCX, etc. |
| storage_url | TEXT         | Storage location     |
| uploaded_by | UUID         | Uploader             |

---

## Knowledge Base

| Field              | Type         | Description          |
| ------------------ | ------------ | -------------------- |
| id                 | UUID         | Knowledge record     |
| resource_id        | UUID         | Source resource      |
| pinecone_namespace | VARCHAR(255) | Pinecone namespace   |
| embedding_model    | VARCHAR(100) | Embedding model used |
| indexed_at         | TIMESTAMP    | Index timestamp      |

---

## AI Conversation

| Field      | Type         | Description             |
| ---------- | ------------ | ----------------------- |
| id         | UUID         | Conversation identifier |
| user_id    | UUID         | User                    |
| course_id  | UUID         | Course                  |
| title      | VARCHAR(255) | Conversation title      |
| created_at | TIMESTAMP    | Creation time           |

---

## Question

| Field            | Type      | Description         |
| ---------------- | --------- | ------------------- |
| id               | UUID      | Question identifier |
| conversation_id  | UUID      | Parent conversation |
| question         | TEXT      | Student question    |
| response         | TEXT      | AI response         |
| confidence_score | DECIMAL   | AI confidence score |
| created_at       | TIMESTAMP | Creation timestamp  |

---

## Escalation

| Field        | Type        | Description           |
| ------------ | ----------- | --------------------- |
| id           | UUID        | Escalation identifier |
| question_id  | UUID        | Escalated question    |
| lecturer_id  | UUID        | Assigned lecturer     |
| status       | VARCHAR(30) | Escalation status     |
| escalated_at | TIMESTAMP   | Escalation timestamp  |

---

## Quiz

| Field           | Type         | Description            |
| --------------- | ------------ | ---------------------- |
| id              | UUID         | Quiz identifier        |
| course_id       | UUID         | Related course         |
| title           | VARCHAR(255) | Quiz title             |
| generated_by_ai | BOOLEAN      | AI generated indicator |
| created_at      | TIMESTAMP    | Creation timestamp     |

---

## Quiz Attempt

| Field        | Type      | Description        |
| ------------ | --------- | ------------------ |
| id           | UUID      | Attempt identifier |
| quiz_id      | UUID      | Parent quiz        |
| student_id   | UUID      | Student            |
| score        | DECIMAL   | Quiz score         |
| submitted_at | TIMESTAMP | Submission time    |

---

## Certificate

| Field      | Type         | Description            |
| ---------- | ------------ | ---------------------- |
| id         | UUID         | Certificate identifier |
| user_id    | UUID         | Certificate owner      |
| title      | VARCHAR(255) | Certificate title      |
| issuer     | VARCHAR(255) | Issuing organization   |
| issue_date | DATE         | Issue date             |

---

## Badge

| Field      | Type         | Description      |
| ---------- | ------------ | ---------------- |
| id         | UUID         | Badge identifier |
| user_id    | UUID         | Badge owner      |
| badge_name | VARCHAR(255) | Badge name       |
| awarded_at | TIMESTAMP    | Award date       |

---

## Skill Passport

| Field           | Type      | Description            |
| --------------- | --------- | ---------------------- |
| id              | UUID      | Passport identifier    |
| user_id         | UUID      | Student                |
| verified_skills | JSONB     | Verified skill records |
| updated_at      | TIMESTAMP | Last update            |

---

## Portfolio

| Field         | Type | Description          |
| ------------- | ---- | -------------------- |
| id            | UUID | Portfolio identifier |
| user_id       | UUID | Owner                |
| portfolio_url | TEXT | Portfolio link       |
| github_url    | TEXT | GitHub profile       |
| linkedin_url  | TEXT | LinkedIn profile     |

---

## Workflow

| Field        | Type         | Description         |
| ------------ | ------------ | ------------------- |
| id           | UUID         | Workflow identifier |
| name         | VARCHAR(255) | Workflow name       |
| trigger_type | VARCHAR(100) | Event trigger       |
| status       | VARCHAR(20)  | Workflow status     |

---

## Notification

| Field       | Type      | Description             |
| ----------- | --------- | ----------------------- |
| id          | UUID      | Notification identifier |
| user_id     | UUID      | Recipient               |
| workflow_id | UUID      | Related workflow        |
| message     | TEXT      | Notification content    |
| is_read     | BOOLEAN   | Read status             |
| created_at  | TIMESTAMP | Creation timestamp      |

---

## Audit Log

| Field       | Type         | Description            |
| ----------- | ------------ | ---------------------- |
| id          | UUID         | Audit entry identifier |
| user_id     | UUID         | User responsible       |
| action      | VARCHAR(255) | Performed action       |
| entity_name | VARCHAR(100) | Affected entity        |
| entity_id   | UUID         | Affected record        |
| ip_address  | VARCHAR(45)  | Client IP              |
| created_at  | TIMESTAMP    | Event timestamp        |

---

# 5. Future Extensions

The data dictionary is designed to accommodate future entities, including:

* Employer
* Internship
* Job Application
* Research Project
* Discussion Forum
* Learning Path
* Calendar Event
* AI Feedback
* Learning Analytics Snapshot
* External LMS Integration

These additions can be incorporated without significant changes to the existing schema.
