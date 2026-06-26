# Data Dictionary

## 1. Table: users

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | UUID | PRIMARY KEY | Unique identifier for each user |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Institutional email address |
| `name` | VARCHAR(255) | NOT NULL | Full name of the user |
| `role` | VARCHAR(50) | NOT NULL | User role (student, lecturer, admin) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date and time user was created |

## 2. Table: courses

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | UUID | PRIMARY KEY | Unique identifier for each course |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Course syllabus identifier (e.g. CS101) |
| `name` | VARCHAR(255) | NOT NULL | Full name of the course |
| `lecturer_id` | UUID | FOREIGN KEY | References users.id |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Date course was created |
