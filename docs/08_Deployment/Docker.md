# Docker Deployment Guide

## 1. Multi-Stage Dockerfile (Example)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000
CMD ["npm", "start"]
```

## 2. Docker Compose
A local docker-compose configuration handles setting up PostgreSQL, Redis, Qdrant, and the N.O.V.A. backend and frontend containers.
