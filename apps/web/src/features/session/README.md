# Session feature

This feature is the web application's public boundary for the signed-in User.
It owns Pinia Colada query keys, cache transitions, access decisions, and the
distinction between “no Session” and “the Session check is unavailable.”

- `useSessionState()` exposes reactive current-User state to layouts and views.
- `useSessionActions()` coordinates login, registration, logout, and Profile
  updates.
- `checkSessionAccess()` gives router guards an authenticated, guest, or
  unavailable decision without exposing query-cache mechanics.

Identity-changing actions cancel the exact current-User query before writing
the authoritative result to the cache. This prevents an older in-flight request
from overwriting a newly established or revoked Session. Remote response and
error normalization remain owned by `@monorepo-fastify-vue/api-client`.

`useSessionActions()` also exposes `updateProfile`. Profile is a distinct
domain concept from Session (see `CONTEXT.md`), but the API represents the
signed-in User's own record — Profile included — as one resource
(`GET`/`PATCH /api/v1/profile/`) cached under one `SESSION_KEY` entry. A
Profile write is therefore an identity-changing action for cache purposes and
needs the same cancel-before-write guard as login/logout/register; splitting
it into the `profile` feature would either duplicate that guard or reach back
into `session` for it, without changing what's on the wire.
