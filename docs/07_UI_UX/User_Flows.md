# User Flows

---

# 1. Introduction

## 1.1 Purpose

This document defines the primary user journeys within the N.O.V.A. platform. User flows describe how different user roles interact with the system to accomplish common tasks while ensuring consistency, usability, and efficiency.

---

# 2. Actors

The primary users of the platform are:

* Student
* Lecturer
* Institution Administrator
* System Administrator

Each actor has different permissions and workflows.

---

# 3. Student Login Flow

## Description

This flow describes how a student authenticates and accesses the platform.

```mermaid
flowchart TD

Start([Start])

Start --> Login[Login Page]

Login --> Credentials[Enter Credentials]

Credentials --> Validate{Valid Credentials?}

Validate -->|Yes| Dashboard[Student Dashboard]

Validate -->|No| Error[Display Error]

Error --> Login
```

---

# 4. AI Academic Assistant Flow

## Description

This flow illustrates how a student interacts with the AI Academic Assistant.

```mermaid
flowchart TD

Student --> AskQuestion

AskQuestion --> Router

Router --> RAG

RAG --> Confidence

Confidence -->|High| AIResponse

Confidence -->|Low| Escalate

Escalate --> Lecturer

Lecturer --> Student
```

---

# 5. Lecturer Resource Upload Flow

## Description

This flow describes how lecturers upload learning resources.

```mermaid
flowchart TD

Lecturer

Lecturer --> Upload

Upload --> Validation

Validation --> Storage

Storage --> KnowledgeBase

KnowledgeBase --> Indexing

Indexing --> Complete
```

---

# 6. Quiz Generation Flow

## Description

Students request AI-generated quizzes based on course content.

```mermaid
flowchart TD

Student

Student --> RequestQuiz

RequestQuiz --> AI

AI --> KnowledgeBase

KnowledgeBase --> Quiz

Quiz --> Student
```

---

# 7. Certificate Verification Flow

## Description

Students upload certificates for verification.

```mermaid
flowchart TD

Student

Student --> UploadCertificate

UploadCertificate --> Verification

Verification --> Approved

Verification --> Rejected

Approved --> SkillPassport

Rejected --> Student
```

---

# 8. Portfolio Generation Flow

## Description

Students generate a professional portfolio.

```mermaid
flowchart TD

Student

Student --> Portfolio

Portfolio --> Skills

Portfolio --> Certificates

Portfolio --> Projects

Skills --> Generator

Certificates --> Generator

Projects --> Generator

Generator --> PortfolioPage
```

---

# 9. Workflow Automation Flow

## Description

Institution administrators create automation workflows.

```mermaid
flowchart TD

Admin

Admin --> CreateWorkflow

CreateWorkflow --> Configure

Configure --> Save

Save --> Trigger

Trigger --> Execute

Execute --> Notification
```

---

# 10. Notification Flow

```mermaid
flowchart LR

System

System --> NotificationService

NotificationService --> WebSocket

WebSocket --> User
```

Notifications are delivered in real time whenever possible.

---

# 11. Student Learning Journey

```mermaid
journey
title Student Learning Journey

section Learning

Login: 5: Student

Select Course: 5: Student

Study Materials: 5: Student

Ask AI: 5: Student

Take Quiz: 4: Student

Receive Feedback: 5: Student

Earn Badge: 5: Student
```

---

# 12. Lecturer Journey

```mermaid
journey
title Lecturer Journey

section Teaching

Login: 5: Lecturer

Create Course: 5: Lecturer

Upload Material: 5: Lecturer

Review AI Escalations: 5: Lecturer

Monitor Analytics: 4: Lecturer
```

---

# 13. Institution Administrator Journey

```mermaid
journey
title Administrator Journey

section Administration

Login: 5: Admin

Manage Users: 5: Admin

Monitor Platform: 5: Admin

Review Reports: 4: Admin

Configure Automation: 5: Admin
```

---

# 14. Navigation Summary

| User                      | Primary Destination   |
| ------------------------- | --------------------- |
| Student                   | Learn Dashboard       |
| Lecturer                  | Teach Dashboard       |
| Institution Administrator | Institution Dashboard |
| System Administrator      | System Console        |

---

# 15. Future User Flows

Future versions of the platform may introduce additional workflows such as:

* Internship Application
* Employer Recruitment
* Research Collaboration
* AI Voice Tutor
* Live Classroom Collaboration
* Multi-Institution Learning
* Community Discussion Forums
