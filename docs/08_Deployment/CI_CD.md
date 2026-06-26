# CI/CD Pipeline

## 1. Overview
The CI/CD pipeline automates testing, code quality checks, containerization, and continuous delivery to staging and production clusters.

## 2. Pipeline Stages (GitHub Actions / GitLab CI)
1. **Lint & Test:**
   * Run code linters (ESLint, Prettier, Ruff/Flake8).
   * Execute unit tests (Vitest/Jest, pytest).
2. **Build & Scan:**
   * Compile application bundles.
   * Build Docker images.
   * Scan containers for vulnerabilities (Trivy).
3. **Publish:**
   * Push validated Docker images to Docker Hub / AWS ECR.
4. **Deploy:**
   * Trigger GitOps rollouts (ArgoCD) or apply `kubectl` configurations to the target environment.
