# Deployment Architecture

## 1. Target Infrastructure
N.O.V.A. is deployed as a secure, containerized web application suitable for cloud or on-premise institutional hosting.

## 2. Infrastructure Diagram
```mermaid
graph LR
    Client[Web Client] --> CDN[CDN / Load Balancer]
    CDN --> K8s[Kubernetes Cluster]
    subgraph K8s
        FrontendPod[Frontend Pods]
        BackendPod[Backend API Pods]
        WorkerPod[Celery / Async Worker Pods]
    end
    BackendPod --> Redis[(Redis Cache & Message Broker)]
    BackendPod --> Postgres[(PostgreSQL DB)]
    BackendPod --> Qdrant[(Qdrant Vector DB)]
    BackendPod --> UiPath[UiPath Orchestrator]
```
