# Test Cases

---

# 1. Introduction

## 1.1 Purpose

This document defines the functional test cases for the N.O.V.A. platform. Each test case validates one or more functional requirements specified in the Software Requirements Specification (SRS).

---

# 2. Test Case Format

Each test case includes:

* Test Case ID
* Module
* Requirement Reference
* Objective
* Preconditions
* Test Steps
* Expected Result
* Priority

---

# 3. Authentication Module

## TC-AUTH-001 – Successful Login

| Field           | Value                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Module          | Authentication                                                                                  |
| Requirement     | FR-001                                                                                          |
| Priority        | Critical                                                                                        |
| Objective       | Verify that a registered user can log in successfully.                                          |
| Preconditions   | User account exists and is active.                                                              |
| Steps           | 1. Open Login Page.<br>2. Enter valid email.<br>3. Enter valid password.<br>4. Click **Login**. |
| Expected Result | User is authenticated and redirected to the dashboard.                                          |

---

## TC-AUTH-002 – Invalid Password

| Field           | Value                                                   |
| --------------- | ------------------------------------------------------- |
| Module          | Authentication                                          |
| Requirement     | FR-001                                                  |
| Priority        | High                                                    |
| Objective       | Verify login rejection with incorrect credentials.      |
| Preconditions   | User account exists.                                    |
| Steps           | Enter valid email and incorrect password.               |
| Expected Result | Authentication fails and an error message is displayed. |

---

## TC-AUTH-003 – Google OAuth Login

| Field           | Value                                                      |
| --------------- | ---------------------------------------------------------- |
| Module          | Authentication                                             |
| Requirement     | FR-001                                                     |
| Priority        | High                                                       |
| Objective       | Verify Google OAuth authentication.                        |
| Preconditions   | Google account available.                                  |
| Steps           | Click **Sign in with Google** and complete authentication. |
| Expected Result | User is authenticated and redirected to the dashboard.     |

---

# 4. RBAC Module

## TC-RBAC-001 – Authorized Access

| Field           | Value                                        |
| --------------- | -------------------------------------------- |
| Module          | Authorization                                |
| Requirement     | FR-002                                       |
| Priority        | Critical                                     |
| Objective       | Verify users can access permitted resources. |
| Preconditions   | User has appropriate permissions.            |
| Expected Result | Requested resource is accessible.            |

---

## TC-RBAC-002 – Unauthorized Access

| Field           | Value                                    |
| --------------- | ---------------------------------------- |
| Module          | Authorization                            |
| Requirement     | FR-002                                   |
| Priority        | Critical                                 |
| Objective       | Verify unauthorized access is blocked.   |
| Preconditions   | User lacks required permission.          |
| Expected Result | HTTP 403 Forbidden response is returned. |

---

# 5. AI Academic Assistant

## TC-AI-001 – Academic Question

| Field           | Value                                           |
| --------------- | ----------------------------------------------- |
| Module          | AI Assistant                                    |
| Requirement     | FR-003                                          |
| Priority        | Critical                                        |
| Objective       | Verify AI answers academic questions.           |
| Preconditions   | Knowledge Base indexed.                         |
| Steps           | Submit an academic question.                    |
| Expected Result | AI returns a grounded response with references. |

---

## TC-AI-002 – Low Confidence Escalation

| Field           | Value                                                    |
| --------------- | -------------------------------------------------------- |
| Module          | AI Assistant                                             |
| Requirement     | FR-003                                                   |
| Priority        | High                                                     |
| Objective       | Verify lecturer escalation for low-confidence responses. |
| Preconditions   | Confidence threshold configured.                         |
| Steps           | Submit a query with insufficient supporting context.     |
| Expected Result | Question is escalated to the lecturer.                   |

---

# 6. RAG Pipeline

## TC-RAG-001 – Knowledge Retrieval

| Field           | Value                                                                |
| --------------- | -------------------------------------------------------------------- |
| Module          | RAG                                                                  |
| Requirement     | FR-004                                                               |
| Priority        | Critical                                                             |
| Objective       | Verify retrieval of relevant knowledge chunks.                       |
| Preconditions   | Knowledge Base indexed.                                              |
| Expected Result | Relevant content is retrieved and ranked before response generation. |

---

# 7. Resource Management

## TC-RES-001 – Upload Resource

| Field           | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| Module          | Teach                                                        |
| Requirement     | FR-006                                                       |
| Priority        | High                                                         |
| Objective       | Verify lecturers can upload course resources.                |
| Preconditions   | Lecturer authenticated.                                      |
| Expected Result | Resource is uploaded successfully and indexed if applicable. |

---

# 8. Quiz Module

## TC-QUIZ-001 – Generate Quiz

| Field           | Value                              |
| --------------- | ---------------------------------- |
| Module          | Quiz                               |
| Requirement     | FR-008                             |
| Priority        | High                               |
| Objective       | Verify AI-generated quiz creation. |
| Preconditions   | Course materials available.        |
| Expected Result | Quiz is generated successfully.    |

---

## TC-QUIZ-002 – Submit Quiz

| Field           | Value                                      |
| --------------- | ------------------------------------------ |
| Module          | Quiz                                       |
| Requirement     | FR-008                                     |
| Priority        | High                                       |
| Objective       | Verify student quiz submission.            |
| Preconditions   | Quiz available.                            |
| Expected Result | Submission is stored and score calculated. |

---

# 9. Skill Passport

## TC-SKILL-001 – Verify Skills

| Field           | Value                                                 |
| --------------- | ----------------------------------------------------- |
| Module          | Skills                                                |
| Requirement     | FR-020                                                |
| Priority        | Medium                                                |
| Objective       | Verify skill verification updates the Skill Passport. |
| Preconditions   | Student has completed verification process.           |
| Expected Result | Verified skills appear in the Skill Passport.         |

---

# 10. Portfolio

## TC-PORT-001 – Generate Portfolio

| Field           | Value                                  |
| --------------- | -------------------------------------- |
| Module          | Portfolio                              |
| Requirement     | FR-021                                 |
| Priority        | Medium                                 |
| Objective       | Verify portfolio generation.           |
| Preconditions   | Student profile contains achievements. |
| Expected Result | Portfolio is generated successfully.   |

---

# 11. Workflow Automation

## TC-WORK-001 – Execute Workflow

| Field           | Value                                                  |
| --------------- | ------------------------------------------------------ |
| Module          | Workflow                                               |
| Requirement     | FR-028                                                 |
| Priority        | High                                                   |
| Objective       | Verify execution of an automation workflow.            |
| Preconditions   | Workflow configured and enabled.                       |
| Expected Result | Workflow executes successfully and logs are generated. |

---

# 12. Notifications

## TC-NOTIF-001 – Receive Notification

| Field           | Value                                                  |
| --------------- | ------------------------------------------------------ |
| Module          | Notifications                                          |
| Requirement     | FR-015                                                 |
| Priority        | Medium                                                 |
| Objective       | Verify notification delivery.                          |
| Preconditions   | Notification event triggered.                          |
| Expected Result | Notification appears in the user's notification panel. |

---

# 13. Audit Logging

## TC-AUDIT-001 – Audit Log Creation

| Field           | Value                                        |
| --------------- | -------------------------------------------- |
| Module          | Audit Logging                                |
| Requirement     | FR-029                                       |
| Priority        | High                                         |
| Objective       | Verify security-relevant actions are logged. |
| Preconditions   | User performs a protected action.            |
| Expected Result | Audit log entry is created successfully.     |

---

# 14. API

## TC-API-001 – Protected Endpoint

| Field           | Value                                                           |
| --------------- | --------------------------------------------------------------- |
| Module          | REST API                                                        |
| Requirement     | API-Architecture                                                |
| Priority        | Critical                                                        |
| Objective       | Verify JWT-protected endpoints reject unauthenticated requests. |
| Expected Result | HTTP 401 Unauthorized response.                                 |

---

# 15. WebSocket

## TC-WS-001 – Notification Delivery

| Field           | Value                                          |
| --------------- | ---------------------------------------------- |
| Module          | WebSocket                                      |
| Requirement     | WebSocket API                                  |
| Priority        | Medium                                         |
| Objective       | Verify real-time notification delivery.        |
| Preconditions   | User connected to WebSocket server.            |
| Expected Result | Notification is received without page refresh. |

---

# 16. Traceability Matrix

| Requirement | Test Cases                            |
| ----------- | ------------------------------------- |
| FR-001      | TC-AUTH-001, TC-AUTH-002, TC-AUTH-003 |
| FR-002      | TC-RBAC-001, TC-RBAC-002              |
| FR-003      | TC-AI-001, TC-AI-002                  |
| FR-004      | TC-RAG-001                            |
| FR-006      | TC-RES-001                            |
| FR-008      | TC-QUIZ-001, TC-QUIZ-002              |
| FR-015      | TC-NOTIF-001                          |
| FR-020      | TC-SKILL-001                          |
| FR-021      | TC-PORT-001                           |
| FR-028      | TC-WORK-001                           |
| FR-029      | TC-AUDIT-001                          |

---

# 17. Future Test Cases

Additional test cases will be added for:

* Employer Portal
* Internship Management
* Research Collaboration
* AI Voice Tutor
* Multi-Institution Support
* Mobile Application
* Offline Mode
