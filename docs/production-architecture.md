# TOEFL Online Production Architecture

## Final target

The repository is now aligned to a production-targeted hybrid architecture:

- `frontend`: React + Vite, built as static assets
- `backend`: NestJS + Fastify API and realtime signaling service
- `cache/realtime`: Redis
- `database`: self-managed PostgreSQL
- `reverse proxy`: Nginx
- `media`: local mounted storage or object storage compatible path

## Deployment stance

The preferred production stance is:

- containerize the application services
  - frontend
  - backend
  - redis
  - optional TURN
- treat PostgreSQL as dedicated infrastructure
  - native on the server or on a separate database host
  - do not make the public app depend on browser storage or third-party hosted Supabase services

This gives repeatable deployment for the app layer while keeping database operations, backup, restore, and maintenance more controlled.

## Why this is the chosen shape

- React preserves the UI investment already made.
- NestJS keeps auth, tests, sessions, proctoring, media, and reports in clear modules.
- PostgreSQL fits relational test data, reporting, auditability, and session history.
- Redis supports transient monitoring state, rate limiting, and realtime coordination.
- Fastify keeps the Node backend efficient for concurrent exam sessions.

## Realtime strategy

The intended production behavior is selective live monitoring, not all-participant full broadcast.

- heartbeat and presence over sockets
- proctoring event logs
- live camera review only for selected active participants
- fallback snapshots when live transport is not available
- TURN to be added for reliable internet-facing WebRTC

This is the practical strategy for 100-200 concurrent participants.

## TOEFL ITP test model

The demo package is now aligned to the official TOEFL ITP Level 1 section structure:

- Listening Comprehension: 50 questions, 35 minutes
- Structure and Written Expression: 40 questions, 25 minutes
- Reading Comprehension: 50 questions, 55 minutes
- Total test time: 115 minutes

Scoring uses ETS-style converted score handling for Level 1 practice usage. This is appropriate for institutional practice and internal reporting, but it is not an official ETS-issued score report.

## Repository status after cleanup

Legacy runtime dependence on Supabase has been removed from the active application path. The repository should now be treated as:

- frontend app in `src/`
- backend API in `backend/src/`
- PostgreSQL schema and seed files in `database/postgresql/`
- local infrastructure helper compose in `infra/`

## Next production concerns

The next production steps are operational, not architectural:

1. reverse proxy and public TLS
2. TURN service for live camera over the internet
3. deployment automation
4. monitoring and alerting
5. backup and restore policy
6. security hardening and secret rotation
