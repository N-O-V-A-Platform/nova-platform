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
