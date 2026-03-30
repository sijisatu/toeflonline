# TOEFL Online Platform

Production-targeted TOEFL ITP practice platform with participant testing flow, admin operations, local media uploads, proctoring, session monitoring, and score reporting.

## Final architecture

The current production target is a hybrid stack:
- frontend: React + Vite
- backend: NestJS + Fastify
- cache/realtime: Redis
- media storage: local server filesystem or mounted volume
- database: PostgreSQL on self-managed infrastructure
- reverse proxy: Nginx
- realtime monitoring: WebSocket signaling with selective live camera review

Operational direction:
- app services are intended to be containerized in production
- PostgreSQL should be treated as first-class infrastructure and can run outside the app containers for safer operations and backup strategy
- TURN should be added later for robust internet-facing live camera transport

## Repository structure

- `src/`: React frontend
- `backend/src/`: NestJS API
- `database/postgresql/`: schema and demo seed SQL
- `infra/`: local infrastructure compose files
- `docs/`: architecture and operational notes

## Current production baseline

- auth and app data are served from the backend and PostgreSQL
- frontend no longer depends on Supabase runtime services
- admin media upload stores files on local server storage
- participant/admin live monitoring uses selective live review with snapshot fallback
- TOEFL ITP scoring now follows ETS-style converted-score behavior for Level 1 practice usage

## Scoring note

This project now uses a TOEFL ITP Level 1 style scoring approach based on ETS official practice-test converted score ranges and official section structure `50/40/50`. It is suitable for institutional practice and internal reporting, but it is not an official ETS score report.

## Local development

Frontend:
- `npm run dev`

Backend:
- `cd backend`
- `npm run dev`

Infrastructure:
- `docker compose -f infra/docker-compose.local.yml up -d`

## Production deployment

Recommended production shape:
- serve the built frontend from Nginx
- proxy `/api` and `/socket.io` to the NestJS backend on `127.0.0.1:4000`
- terminate TLS at Nginx
- keep `BACKEND_TLS_ENABLED=false` when TLS is already handled by Nginx

Production helpers in this repo:
- `backend/.env.production.example`: backend environment template
- `infra/nginx/toeflonline.production.conf`: sample Nginx site config
- `infra/systemd/toeflonline-backend.service`: sample backend service unit
- `docs/deployment.md`: step-by-step native deployment notes
- `docs/production-checklist.md`: preflight and post-deploy checklist

## Deployment posture

This repo is being prepared as a deployable application baseline, not just a local prototype. The remaining production work should focus on deployment automation, reverse proxy/TLS, TURN, monitoring, and hardening rather than another backend rewrite.
