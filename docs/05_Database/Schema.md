# Database Schema

---

# 1. Introduction

## 1.1 Purpose

This document defines the logical database schema for the N.O.V.A. platform. It specifies the primary entities, attributes, primary keys, foreign keys, constraints, and relationships required to support the platform.

The schema follows the Entity-Relationship (ER) model defined in the ER Diagram document while maintaining normalization and referential integrity.

---

# 2. Schema Design Principles

The database schema follows these principles:

* UUID primary keys for all entities.
* Third Normal Form (3NF) where practical.
* Foreign key constraints for referential integrity.
* Audit fields for all major entities.
* Institution-aware multi-tenancy.
* Soft deletion for critical business records.
* Timestamps for data lifecycle tracking.

---

# 3. Core Tables

## 3.1 Institution

| Column     | Type         | Constraints |
| ---------- | ------------ | ----------- |
| id         | UUID         | Primary Key |
| name       | VARCHAR(255) | Not Null    |
| code       | VARCHAR(50)  | Unique      |
| address    | TEXT         | Nullable    |
| created_at | TIMESTAMP    | Not Null    |
| updated_at | TIMESTAMP    | Not Null    |

---

## 3.2 Department

| Column         | Type         | Constraints    |
| -------------- | ------------ | -------------- |
| id             | UUID         | Primary Key    |
| institution_id | UUID         | FK Institution |
| name           | VARCHAR(255) | Not Null       |
| code           | VARCHAR(50)  | Unique         |
| created_at     | TIMESTAMP    | Not Null       |

---

## 3.3 User

| Column         | Type         | Constraints     |
| -------------- | ------------ | --------------- |
| id             | UUID         | Primary Key     |
| institution_id | UUID         | FK Institution  |
| role_id        | UUID         | FK Role         |
| first_name     | VARCHAR(100) | Not Null        |
| last_name      | VARCHAR(100) | Not Null        |
| email          | VARCHAR(255) | Unique          |
| password_hash  | TEXT         | Not Null        |
| status         | VARCHAR(20)  | Active/Inactive |
| created_at     | TIMESTAMP    | Not Null        |
| updated_at     | TIMESTAMP    | Not Null        |

---

## 3.4 Role

| Column      | Type         | Constraints |
| ----------- | ------------ | ----------- |
| id          | UUID         | Primary Key |
| name        | VARCHAR(100) | Unique      |
| description | TEXT         | Nullable    |

---

## 3.5 Permission

| Column          | Type         | Constraints |
| --------------- | ------------ | ----------- |
| id              | UUID         | Primary Key |
| role_id         | UUID         | FK Role     |
| permission_name | VARCHAR(150) | Not Null    |

---

## 3.6 Course

| Column        | Type         | Constraints   |
| ------------- | ------------ | ------------- |
| id            | UUID         | Primary Key   |
| department_id | UUID         | FK Department |
| lecturer_id   | UUID         | FK User       |
| title         | VARCHAR(255) | Not Null      |
| code          | VARCHAR(50)  | Unique        |
| semester      | INTEGER      | Not Null      |
| credits       | INTEGER      | Not Null      |

---

## 3.7 Enrollment

| Column      | Type      | Constraints |
| ----------- | --------- | ----------- |
| id          | UUID      | Primary Key |
| student_id  | UUID      | FK User     |
| course_id   | UUID      | FK Course   |
| enrolled_at | TIMESTAMP | Not Null    |

---

## 3.8 Lecture

| Column       | Type         | Constraints |
| ------------ | ------------ | ----------- |
| id           | UUID         | Primary Key |
| course_id    | UUID         | FK Course   |
| topic        | VARCHAR(255) | Not Null    |
| lecture_date | DATE         | Not Null    |
| duration     | INTEGER      | Minutes     |

---

## 3.9 Resource

| Column      | Type         | Constraints |
| ----------- | ------------ | ----------- |
| id          | UUID         | Primary Key |
| course_id   | UUID         | FK Course   |
| lecture_id  | UUID         | FK Lecture  |
| file_name   | VARCHAR(255) | Not Null    |
| file_type   | VARCHAR(50)  | Not Null    |
| storage_url | TEXT         | Not Null    |
| uploaded_by | UUID         | FK User     |

---

## 3.10 Knowledge Base

| Column             | Type         | Constraints |
| ------------------ | ------------ | ----------- |
| id                 | UUID         | Primary Key |
| resource_id        | UUID         | FK Resource |
| pinecone_namespace | VARCHAR(255) | Not Null    |
| embedding_model    | VARCHAR(100) | Not Null    |
| indexed_at         | TIMESTAMP    | Not Null    |

---

## 3.11 AI Conversation

| Column     | Type         | Constraints |
| ---------- | ------------ | ----------- |
| id         | UUID         | Primary Key |
| user_id    | UUID         | FK User     |
| course_id  | UUID         | FK Course   |
| title      | VARCHAR(255) | Nullable    |
| created_at | TIMESTAMP    | Not Null    |

---

## 3.12 Question

| Column           | Type         | Constraints        |
| ---------------- | ------------ | ------------------ |
| id               | UUID         | Primary Key        |
| conversation_id  | UUID         | FK AI Conversation |
| question         | TEXT         | Not Null           |
| response         | TEXT         | Nullable           |
| confidence_score | DECIMAL(5,2) | Nullable           |
| created_at       | TIMESTAMP    | Not Null           |

---

## 3.13 Escalation

| Column       | Type        | Constraints      |
| ------------ | ----------- | ---------------- |
| id           | UUID        | Primary Key      |
| question_id  | UUID        | FK Question      |
| lecturer_id  | UUID        | FK User          |
| status       | VARCHAR(30) | Pending/Resolved |
| escalated_at | TIMESTAMP   | Not Null         |

---

## 3.14 Quiz

| Column          | Type         | Constraints   |
| --------------- | ------------ | ------------- |
| id              | UUID         | Primary Key   |
| course_id       | UUID         | FK Course     |
| title           | VARCHAR(255) | Not Null      |
| generated_by_ai | BOOLEAN      | Default FALSE |
| created_at      | TIMESTAMP    | Not Null      |

---

## 3.15 Quiz Attempt

| Column       | Type         | Constraints |
| ------------ | ------------ | ----------- |
| id           | UUID         | Primary Key |
| quiz_id      | UUID         | FK Quiz     |
| student_id   | UUID         | FK User     |
| score        | DECIMAL(5,2) | Nullable    |
| submitted_at | TIMESTAMP    | Not Null    |

---

## 3.16 Certificate

| Column     | Type         | Constraints |
| ---------- | ------------ | ----------- |
| id         | UUID         | Primary Key |
| user_id    | UUID         | FK User     |
| title      | VARCHAR(255) | Not Null    |
| issuer     | VARCHAR(255) | Not Null    |
| issue_date | DATE         | Not Null    |

---

## 3.17 Badge

| Column     | Type         | Constraints |
| ---------- | ------------ | ----------- |
| id         | UUID         | Primary Key |
| user_id    | UUID         | FK User     |
| badge_name | VARCHAR(255) | Not Null    |
| awarded_at | TIMESTAMP    | Not Null    |

---

## 3.18 Skill Passport

| Column          | Type      | Constraints |
| --------------- | --------- | ----------- |
| id              | UUID      | Primary Key |
| user_id         | UUID      | FK User     |
| verified_skills | JSONB     | Not Null    |
| updated_at      | TIMESTAMP | Not Null    |

---

## 3.19 Portfolio

| Column        | Type | Constraints |
| ------------- | ---- | ----------- |
| id            | UUID | Primary Key |
| user_id       | UUID | FK User     |
| portfolio_url | TEXT | Nullable    |
| github_url    | TEXT | Nullable    |
| linkedin_url  | TEXT | Nullable    |

---

## 3.20 Workflow

| Column       | Type         | Constraints     |
| ------------ | ------------ | --------------- |
| id           | UUID         | Primary Key     |
| name         | VARCHAR(255) | Not Null        |
| trigger_type | VARCHAR(100) | Not Null        |
| status       | VARCHAR(20)  | Active/Inactive |

---

## 3.21 Notification

| Column      | Type      | Constraints   |
| ----------- | --------- | ------------- |
| id          | UUID      | Primary Key   |
| user_id     | UUID      | FK User       |
| workflow_id | UUID      | FK Workflow   |
| message     | TEXT      | Not Null      |
| is_read     | BOOLEAN   | Default FALSE |
| created_at  | TIMESTAMP | Not Null      |

---

## 3.22 Audit Log

| Column      | Type         | Constraints |
| ----------- | ------------ | ----------- |
| id          | UUID         | Primary Key |
| user_id     | UUID         | FK User     |
| action      | VARCHAR(255) | Not Null    |
| entity_name | VARCHAR(100) | Not Null    |
| entity_id   | UUID         | Not Null    |
| ip_address  | VARCHAR(45)  | Nullable    |
| created_at  | TIMESTAMP    | Not Null    |

---

# 4. Naming Conventions

The schema follows these conventions:

* Singular table names.
* UUID primary keys named `id`.
* Foreign keys use `<entity>_id`.
* Snake_case naming.
* Timestamps use `created_at` and `updated_at`.

---

# 5. Future Enhancements

Future schema extensions may include:

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
