# Frontend Migration Notes

The current frontend works because `src/lib/supabase.ts` simulates auth and database behavior in browser storage. That file must become a real HTTP client layer.

## Replacement approach

- keep the domain models in a new `src/types/api.ts`
- replace `supabase.from(... )` calls with explicit API functions
- centralize auth token storage and refresh behavior
- centralize WebSocket subscriptions for admin live-monitor updates

## Suggested frontend service split

- `src/api/client.ts`
- `src/api/auth.ts`
- `src/api/tests.ts`
- `src/api/sessions.ts`
- `src/api/proctoring.ts`
- `src/api/reports.ts`

## First screens to migrate

1. Login
2. Participant dashboard package list
3. Test start session
4. Admin live sessions

These give the fastest proof that the browser mock is no longer the source of truth.
