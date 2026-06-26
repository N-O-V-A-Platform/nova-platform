# Kubernetes Deployment Guide

## 1. Overview
N.O.V.A. is orchestrated in Kubernetes to ensure high availability, automatic scaling during classroom usage spikes, and rolling updates.

## 2. Resource Manifests (Draft)
* **Deployments:** `nova-frontend`, `nova-backend-api`, `nova-worker`.
* **Services:** ClusterIP services for backend/worker services, NodePort/LoadBalancer for frontend/ingress.
* **ConfigMaps & Secrets:** Base environment variables, database URLs, and API keys.
* **Ingress:** Routes external domain traffic (`nova.edu`) to the frontend service.
