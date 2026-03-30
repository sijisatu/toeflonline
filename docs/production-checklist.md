# Production Checklist

## Before deploy

- `npm ci` succeeds in both repo root and `backend/`
- `npm run build` succeeds in both repo root and `backend/`
- `backend/.env.production.example` has been copied to a real runtime env file
- `APP_ENV=production`
- `APP_ORIGIN` matches the final public HTTPS origin exactly
- `BACKEND_TLS_ENABLED=false` when TLS is terminated by Nginx
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are long random values
- PostgreSQL database exists and application user has the required privileges
- Redis is reachable from the backend host
- `database/postgresql/001_initial_schema.sql` has been applied
- `database/postgresql/002_seed_demo.sql` is applied only if demo accounts are desired
- frontend build output has been copied to the Nginx web root
- Nginx site config has the correct `server_name`, TLS cert paths, and frontend `root`
- backend service manager config points to the correct repo path and env file

## First boot

- backend starts and binds to `127.0.0.1:4000`
- `https://your-domain.example/api/health` returns `status: ok`
- homepage loads over HTTPS without mixed-content errors
- login works for a real or demo account
- `/api` requests succeed from the browser with no CORS errors
- `/socket.io` upgrades successfully
- media upload succeeds and uploaded files are readable back from the app

## Before opening to users

- remove demo accounts if they are not intended for production
- confirm firewall exposes only intended ports
- enable log rotation for app and Nginx logs
- configure automatic service restart on failure
- verify PostgreSQL backup policy
- verify Redis persistence policy if session/realtime state matters
- confirm disk path and permissions for `storage/`
- test proctoring camera flow from a real browser over HTTPS
- test one admin session and one participant session end to end

## Post-deploy checks

- CPU, memory, and disk usage are within expected range
- Nginx error log is clean
- backend log is clean
- login, test start, answer save, report calculation, and media access still work
- certificate renewal path is documented
- rollback plan is documented
