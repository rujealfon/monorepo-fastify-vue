# Sessions module

This module owns the server-side Session lifecycle: establishing a Session
after User credential verification, authenticating it, and revoking it.

`sessions.service.ts` is the lifecycle policy boundary. It coordinates expiry,
persistence, authentication, and revocation. PostgreSQL access is kept behind
`sessions.repository.ts`; the Drizzle table and Zod claim validator live beside
the module in `sessions.schema.ts`.

`sessions.plugin.ts` is the thin Fastify adapter. It registers `app.session` and
owns JWT and cookie transport mechanics. Routes and handlers call that public
interface instead of importing repository or signing details. Same-origin
request defense remains a separate security plugin.

Service tests cover lifecycle and persistence collaboration, plugin tests cover
claim validation and transport adaptation, and User route tests exercise the
complete flow against the test PostgreSQL database.
