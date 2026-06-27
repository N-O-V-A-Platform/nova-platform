# Software Requirements Specification (SRS)

**Project Name:** N.O.V.A.

**Full Form:** Next-gen Optimized Virtual Assistant

**Document Version:** v0.1

**Prepared By:** Arjun R

**Status:** Draft

---

# 1. Introduction

## 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional and non-functional requirements for N.O.V.A. It serves as the primary reference for developers, software architects, testers, and stakeholders throughout the software development lifecycle.

The objective of this document is to describe how the N.O.V.A. platform shall behave, the constraints under which it operates, and the requirements necessary to achieve the product vision defined in the Product Requirements Document (PRD).

---

## 1.2 Scope

N.O.V.A. (Next-gen Optimized Virtual Assistant) is an AI-powered Academic Operating System designed to enhance teaching and learning through intelligent assistance, academic automation, real-time classroom interaction, and learning analytics.

Version 1 focuses on engineering colleges while maintaining a modular architecture that supports future expansion to universities, schools, corporate training environments, and certification platforms.

---

## 1.3 Definitions, Acronyms and Abbreviations

| Term | Description                         |
| ---- | ----------------------------------- |
| AI   | Artificial Intelligence             |
| RAG  | Retrieval-Augmented Generation      |
| LLM  | Large Language Model                |
| UI   | User Interface                      |
| UX   | User Experience                     |
| API  | Application Programming Interface   |
| RBAC | Role-Based Access Control           |
| RPA  | Robotic Process Automation          |
| SRS  | Software Requirements Specification |
| PRD  | Product Requirements Document       |

---

## 1.4 References

* Product Requirements Document (PRD) – N.O.V.A.
* IEEE 29148 – Systems and Software Engineering Requirements
* Project Architecture Documentation (Future)
* User Interface Design Documentation (Future)

---

## 1.5 Document Overview

This document specifies the software behavior, functional requirements, non-functional requirements, external interfaces, system constraints, and operational expectations of the N.O.V.A. platform. It acts as the technical foundation for software development and system validation.

# 2. Overall Description

## 2.1 Product Perspective

N.O.V.A. is a modular AI-powered Academic Operating System that integrates intelligent learning assistance, educator support, academic automation, verified skill tracking, and institutional analytics into a unified platform.

The system is designed using a modular architecture to support future scalability, maintainability, and extensibility while remaining adaptable to different educational environments.

---

## 2.2 Product Functions

The platform shall provide the following high-level capabilities:

* AI-assisted academic question answering.
* Retrieval-Augmented Generation (RAG) using lecturer-approved materials.
* Live classroom interaction.
* Lecturer dashboard and classroom analytics.
* Student learning progress tracking.
* Skill Passport and certificate verification.
* UiPath-powered workflow automation.
* Institutional analytics and reporting.
* Secure authentication and role-based access control.

---

## 2.3 User Classes

The platform supports multiple user roles.

### Student

Primary learner using the AI assistant and learning services.

### Lecturer

Academic content provider and classroom manager.

### Institution Administrator

Platform administrator responsible for institutional monitoring and reporting.

### System Administrator

Responsible for system configuration, maintenance, user management, and operational support.

---

## 2.4 Operating Environment

Version 1 of N.O.V.A. will operate primarily as a web-based platform accessible through modern desktop and mobile web browsers.

The platform is expected to support cloud deployment and operate reliably under concurrent classroom usage.

---

## 2.5 Design Constraints

The system shall comply with institutional academic policies, privacy requirements, and secure software engineering practices.

The platform shall prioritize reliability, scalability, maintainability, and modularity throughout its architecture.

---

## 2.6 Assumptions and Dependencies

* Lecturers will upload academic resources for AI retrieval.
* Internet connectivity is available during platform usage.
* External AI and automation services remain available.
* Institutions permit AI-assisted learning within their academic environment.
* Students authenticate using institution-approved credentials where applicable.

# 3. External Interface Requirements

## 3.1 User Interfaces

N.O.V.A. shall provide role-specific user interfaces tailored to the responsibilities and permissions of each user category.

### Student Interface

* AI-powered academic chat interface.
* Personalized learning dashboard.
* Skill Passport and verified certificates.
* Learning progress and achievement tracking.
* Course resources and lecturer-recommended videos.
* Notifications and announcements.

### Lecturer Interface

* Lecturer dashboard.
* Course and resource management.
* Live Lecture Mode.
* AI escalation dashboard.
* Student engagement analytics.
* Report generation.

### Administrator Interface

* Institution dashboard.
* User and role management.
* Platform analytics.
* Department reports.
* System monitoring.
* Configuration management.

---

## 3.2 Hardware Interfaces

The platform shall operate on standard desktop computers, laptops, tablets, and smartphones through supported web browsers.

No specialized hardware shall be required for Version 1.

Optional devices such as webcams and microphones may be used for future platform enhancements.

---

## 3.3 Software Interfaces

N.O.V.A. shall integrate with internal and external software services, including:

* Large Language Model (LLM) providers.
* Pinecone Vector Database.
* PostgreSQL Database.
* UiPath Automation Platform.
* Email notification services.
* Authentication providers.
* Future Learning Management Systems (LMS).

---

## 3.4 Communication Interfaces

The platform shall communicate using secure HTTPS protocols.

Real-time communication shall be supported using WebSockets for features including:

* Live Lecture Mode.
* Instant notifications.
* AI escalation alerts.
* Live classroom analytics.

All communication shall be encrypted using industry-standard security protocols.

# 4. Functional Requirements

## Learn Module

---

### FR-001 – User Authentication

**Description**

The system shall authenticate users using one of the configured authentication providers before granting access to protected platform resources.

---

**Actors**

* Student
* Lecturer
* Institution Administrator
* System Administrator

---

**Priority**

Critical

---

**Preconditions**

* The user has a registered account.
* At least one authentication provider is configured.
* The authentication service is available.

---

**Authentication Providers (Version 1)**

* Email & Password
* Google OAuth

**Future Providers**

* Microsoft Entra ID
* Institution Single Sign-On (SSO)
* LDAP

---

**Inputs**

Depending on the configured authentication provider, authentication credentials may include:

* Email and Password
* Google OAuth Token
* Institution SSO Credentials

---

**Processing**

1. Accept the user's authentication request.
2. Forward the request to the configured authentication provider.
3. Validate the user's identity.
4. Retrieve the user's UUID.
5. Retrieve the assigned roles and permissions.
6. Establish a secure authenticated session.
7. Generate a secure session token.
8. Redirect the user to the appropriate dashboard.

---

**Outputs**

* Successful authentication
* Secure session token
* User dashboard
* Assigned permissions

---

**Postconditions**

* The user is authenticated.
* A secure session has been established.
* Permissions are assigned according to the RBAC model.
* User activity logging is initiated.

---

**Failure Conditions**

* Invalid credentials
* Unsupported authentication provider
* Locked account
* Authentication provider unavailable
* Network timeout
* Expired session

---

**Dependencies**

* ED-001 – Pluggable Authentication Framework
* ED-002 – Role-Based Access Control
* ED-003 – UUID-Based User Identity
* ED-004 – Permission-Based RBAC

---

**Acceptance Criteria**

* Only authenticated users shall access protected resources.
* Authentication shall support multiple authentication providers.
* Every authenticated user shall receive a globally unique UUID.
* Sessions shall be securely established after successful authentication.
* Appropriate permissions shall be assigned before dashboard access is granted.
* Failed authentication attempts shall return informative but secure error messages.

