# Native Production Deployment

This repo can be deployed natively without containers.

## Target shape

- frontend: static build served by Nginx
- backend: NestJS service on `127.0.0.1:4000`
- database: PostgreSQL
- cache: Redis
- TLS: terminated at Nginx

## 1. Install dependencies

Frontend:
- `npm ci`
- `npm run build`

Backend:
- `cd backend`
- `npm ci`
- `npm run build`

## 2. Configure backend

Start from:
- `backend/.env.production.example`

Set these values for your server:
- `APP_ENV=production`
- `APP_ORIGIN=https://your-domain.example`
- `BACKEND_TLS_ENABLED=false`
- `POSTGRES_*`
- `REDIS_*`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

## 3. Prepare PostgreSQL

Run:
- `database/postgresql/001_initial_schema.sql`
- `database/postgresql/002_seed_demo.sql` if you want demo accounts

The schema no longer depends on `pgcrypto`; it can be applied by the application database owner.

## 4. Run backend

Example:

```bash
cd /path/to/toeflonline-main/backend
npm run start:prod
```

Expected listener:
- `127.0.0.1:4000` behind Nginx

For long-running production use, prefer a service manager:
- `infra/systemd/toeflonline-backend.service`

## 5. Configure Nginx

Use:
- `infra/nginx/toeflonline.production.conf`

Adjust:
- `server_name`
- TLS certificate paths
- frontend `root`

## 6. Frontend location

Copy the built frontend to the directory used by Nginx. Example:

```bash
mkdir -p /var/www/toeflonline
cp -r /path/to/toeflonline-main/dist /var/www/toeflonline/
```

## Notes

- `scripts/https-gateway.mjs` is for local HTTPS testing only. It is not the recommended production path.
- For production, prefer one public HTTPS origin and same-origin API routing through Nginx.
- WebRTC over the public internet will still benefit from a TURN server for reliability.
- Before going live, walk through `docs/production-checklist.md`.
