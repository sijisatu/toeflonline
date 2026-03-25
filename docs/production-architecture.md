# TOEFL Online Production Architecture

## Target shape

- `frontend`: existing Vite React app, migrated away from `localStorage` mock data
- `backend`: NestJS API with Fastify adapter
- `database`: PostgreSQL on self-managed server
- `cache/realtime`: Redis for rate limiting, pub/sub, and transient monitoring state
- `reverse proxy`: Nginx for TLS termination, static assets, API proxying, and WebSocket upgrade

## Why this stack

- React can be retained, so the current UI investment is preserved.
- NestJS gives clear module boundaries for auth, sessions, tests, proctoring, and reports.
- PostgreSQL fits relational exam data, auditability, and reporting better than browser storage.
- Redis reduces pressure on PostgreSQL for presence, heartbeats, and admin live-monitor dashboards.
- Fastify keeps the Node backend efficient under 100-200 concurrent exam participants.

## Realtime strategy

The system should not attempt to stream live video for every participant at all times. For 100-200 concurrent participants over the internet, the scalable baseline is:

- WebSocket heartbeat for participant presence
- proctoring events such as tab switch, fullscreen exit, camera off, mic off
- progress updates and answer autosave events
- optional snapshot uploads on interval or on suspicious events
- selective live review only for flagged participants

This keeps CPU, bandwidth, and browser load within practical limits.

## Deployment layout

### Single-server first phase

- Nginx
- React static build
- NestJS API
- PostgreSQL
- Redis
- local media storage for audio, image assets, and proctoring snapshots

This is enough to start, provided the machine has strong SSD performance and adequate RAM.

### Hardening for internet access

- HTTPS only
- PostgreSQL and Redis bound to private interfaces
- firewall only exposing `80` and `443`
- automated backups for PostgreSQL
- rate limiting on auth and proctoring endpoints
- structured logs for admin and participant actions

## Migration path from current repo

1. Keep the current React app running during transition.
2. Replace the mock layer in `src/lib/supabase.ts` with a typed API client.
3. Move auth to backend-issued tokens and PostgreSQL-backed users.
4. Move packages, questions, sessions, answers, certificates, and proctoring logs to PostgreSQL.
5. Replace admin polling with WebSocket subscriptions for live session monitoring.
6. Add object storage handling for audio assets and proctoring snapshots.
7. Run load tests before production launch.

## Backend modules

- `auth`: login, refresh, logout, roles
- `tests`: packages, sections, questions, assets
- `sessions`: create session, autosave answers, timer checkpoints, finish exam
- `proctoring`: event ingestion, snapshot registration, admin monitoring sockets
- `reports`: scoring summaries, exports, participant result history
- `health`: infrastructure readiness

## Immediate next implementation steps

1. Create PostgreSQL migration files for the non-Supabase schema.
2. Implement auth tables and JWT flow in the backend.
3. Add `apiClient` in the frontend and remove the local `supabase` mock.
4. Wire participant session creation and admin session listing to the backend.
