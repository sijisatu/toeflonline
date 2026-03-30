# Frontend Runtime Notes

The frontend is no longer backed by browser-only mock storage. `src/lib/supabase.ts` is currently a compatibility shim that talks to the NestJS backend over HTTP/WebSocket while preserving the existing call shape.

## Important implication

`src/lib/supabase.ts` is now an application transport shim, not a real Supabase client. It remains in place only to avoid a large UI refactor during the production hardening phase.

## Recommended future refactor

When the application is functionally stable in production, split the shim into explicit API modules:

- `src/api/client.ts`
- `src/api/auth.ts`
- `src/api/tests.ts`
- `src/api/sessions.ts`
- `src/api/proctoring.ts`
- `src/api/reports.ts`

That refactor is now optional technical debt cleanup, not a production blocker.
