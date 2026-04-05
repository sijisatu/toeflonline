# TOEFL Online Platform

Production-targeted TOEFL ITP practice platform with participant testing flow, admin operations, local media uploads, proctoring, session monitoring, and score reporting.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | NestJS + Fastify |
| Database | PostgreSQL |
| Cache / Realtime | Redis + WebSocket |
| Media storage | Local server filesystem / mounted volume |
| Reverse proxy | Nginx (self-hosted) |

## Repository structure

```
src/                    React frontend
backend/src/            NestJS API
database/postgresql/    Schema and demo seed SQL
infra/                  Local docker-compose and Nginx/systemd configs
scripts/                Helper scripts (init-db.sh, start-local.sh, …)
docs/                   Architecture and operational notes
```

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo-toefl.local | Admin123! |
| Participant | participant@demo-toefl.local | Participant123! |

These accounts are created by `database/postgresql/002_seed_demo.sql`.

---

## Local development

### 1. Start infrastructure

```bash
docker compose -f infra/docker-compose.local.yml up -d
```

This starts PostgreSQL on `localhost:5432` and Redis on `localhost:6379`.

### 2. Initialise the database

Run once after the containers are up (or after a fresh volume wipe):

```bash
./scripts/init-db.sh
```

This applies the schema (`001_initial_schema.sql`) and the demo seed (`002_seed_demo.sql`).  
To skip the seed data: `./scripts/init-db.sh --no-seed`

The script reads connection details from environment variables. Defaults match the docker-compose values, so no extra configuration is needed for a standard local setup. See `./scripts/init-db.sh --help` for all options.

### 3. Configure the backend

```bash
cp backend/.env.local.example backend/.env
```

Edit `backend/.env` if your local PostgreSQL or Redis credentials differ from the defaults.

### 4. Run the backend dev server

```bash
cd backend
npm install
npm run dev
```

API is available at `http://localhost:4000/api`.

### 5. Run the frontend dev server

```bash
npm install
npm run dev
```

Frontend is available at `http://localhost:5173`.

---

## Deploying to Railway

### Prerequisites

- A Railway project with a **Postgres** service already provisioned.
- Optionally a **Redis** service for session caching and realtime features.

### 1. Set backend environment variables

In the Railway dashboard, open your backend service → **Variables → Raw Editor** and paste the contents of `backend/.env.production.example`, then fill in the real values:

```
PORT=8080
APP_ENV=production
APP_ORIGIN=https://your-app.up.railway.app
BACKEND_TLS_ENABLED=false
JWT_ACCESS_SECRET=<generate with: openssl rand -hex 64>
JWT_REFRESH_SECRET=<generate with: openssl rand -hex 64>
POSTGRES_HOST=${{Postgres.PGHOST}}
POSTGRES_PORT=${{Postgres.PGPORT}}
POSTGRES_DB=${{Postgres.PGDATABASE}}
POSTGRES_USER=${{Postgres.PGUSER}}
POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}
PROCTORING_SNAPSHOT_PATH=storage/proctoring
```

The `${{Postgres.*}}` and `${{Redis.*}}` references are Railway reference variables — they resolve automatically from the linked services.

### 2. Initialise the database (one-off)

After the first successful deploy, run the init script via the Railway CLI:

```bash
# Install the Railway CLI if needed: npm i -g @railway/cli
railway login
railway run --service <your-backend-service-name> ./scripts/init-db.sh
```

Or connect directly using the Postgres service's public URL:

```bash
DATABASE_URL="$(railway variables get DATABASE_URL --service Postgres)" \
  ./scripts/init-db.sh
```

### 3. Deploy

Push to your linked branch or trigger a manual deploy from the Railway dashboard. The backend will start on `PORT=8080` as required by Railway.

---

## Production deployment (self-hosted)

Recommended shape:
- Serve the built frontend from Nginx.
- Proxy `/api` and `/socket.io` to the NestJS backend on `127.0.0.1:4000`.
- Terminate TLS at Nginx; keep `BACKEND_TLS_ENABLED=false`.

Production helpers in this repo:
- `backend/.env.production.example` — backend environment template
- `infra/nginx/toeflonline.production.conf` — sample Nginx site config
- `infra/systemd/toeflonline-backend.service` — sample systemd service unit
- `docs/deployment.md` — step-by-step native deployment notes
- `docs/production-checklist.md` — preflight and post-deploy checklist

---

## Scoring note

This project uses a TOEFL ITP Level 1 style scoring approach based on ETS official practice-test converted score ranges and the official section structure `50/40/50`. It is suitable for institutional practice and internal reporting, but it is not an official ETS score report.
