# @monorepo-fastify-vue/api

Fastify REST API. See the [root README](../../README.md) for full setup instructions.

## Scripts

Run from this directory, or via `pnpm --filter @monorepo-fastify-vue/api <script>` from the repo root.

| Script | Description |
| --- | --- |
| `pnpm dev` | Start in watch mode (`tsx watch`) |
| `pnpm build` | Compile to `dist/` |
| `pnpm start` | Run the compiled build (`node dist/server.js`) |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm lint` / `pnpm lint:fix` | Lint (and fix) |
| `pnpm test` | Run Vitest against `.env.test`'s database |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the dev database |
| `pnpm db:migrate:test` | Apply pending migrations to the test database |
| `pnpm db:studio` | Open Drizzle Studio |

In development, Scalar is served at `/` and its OpenAPI document at `/openapi.json`. Documentation routes are not registered in test or production.

## Project structure

The API is an explicitly composed modular monolith:

```text
src/
├── app.ts                         # Fastify construction and plugin composition
├── server.ts                      # Process entry point only
├── config/index.ts                # Validated runtime configuration
├── db/
│   ├── index.ts                   # Drizzle client
│   ├── migrations/                # Generated migrations
│   └── schema/index.ts            # Drizzle Kit composition barrel
├── plugins/
│   ├── auth.ts                    # Session cookie transport adapter
│   ├── compress.ts
│   ├── db.ts
│   ├── error-handler.ts
│   ├── multipart.ts
│   ├── openapi.ts
│   ├── security.ts                # Headers, rate limits, and same-origin defense
│   ├── sensible.ts
│   └── static.ts
├── modules/
│   ├── index.ts                   # Explicit route registry
│   ├── health/
│   │   ├── index.ts               # Public module API
│   │   ├── health.routes.ts
│   │   └── __tests__/
│   └── users/
│       ├── index.ts               # Public module API
│       ├── users.routes.ts        # /auth/* (register, login, logout) and /profile
│       ├── users.handlers.ts
│       ├── users.service.ts
│       ├── users.repository.ts
│       ├── users.schema.ts        # users + profiles + sessions tables
│       ├── users.types.ts         # Internal Session values crossing the Fastify seam
│       ├── users.errors.ts
│       ├── users.password.ts
│       └── __tests__/
├── events/                        # Shared in-process event infrastructure
├── jobs/                          # Shared job infrastructure
├── lib/                           # Shared technical helpers
└── test/                          # Cross-module test helpers
```

Layer responsibilities:

| Layer | Responsibility |
| --- | --- |
| Routes | Fastify route registration and request/response schemas |
| Handlers | HTTP request, reply, and status-code concerns |
| Services | Business rules and domain errors |
| Repositories | Drizzle queries and persistence |
| Schemas | Module-owned Drizzle tables and Zod validators |

## Module boundaries

Domains live in `src/modules/<domain>` and expose their public API from `index.ts`; `src/modules/index.ts` is the only route registry. Cross-domain callers use `#api/modules/<domain>`, never internal files. Tables and validators remain module-owned, with `src/db/schema/index.ts` as the only deep-import exception for Drizzle Kit. Tests stay beside their module in `__tests__`.

Add a module by keeping its code local, exporting routes from its `index.ts`, adding its public import mapping to `package.json`, and registering it in `src/modules/index.ts`. Keep code local until it has at least two real consumers.

## Authentication

This starter template ships session-cookie authentication with no role or permission system. The users module owns credential checks and the Session lifecycle; `plugins/auth.ts` adapts that behavior to signed cookies and Fastify requests:

- `app.authenticate` — verifies the session cookie, throws `UnauthorizedError` otherwise. Use as an `onRequest` hook on any route that requires a signed-in user.
- `app.setSession(reply, session)` and `app.clearSession(reply)` — translate a Session to and from the cookie transport.
- `app.sessionIdentity(request)` — reads an optional Session identity for idempotent logout.

`plugins/security.ts` exposes `app.sameOrigin`, which rejects cross-site state-changing requests. Use it as a `preHandler` on mutating routes.

Protect a new route by requiring a session:

```ts
app.get('/', {
  onRequest: [app.authenticate]
}, handlers.list)
```

There is no `app.authorize(...)` or permission-key system in this template. If a future feature needs per-user access control beyond "is signed in," reintroduce a roles/permissions module and extend `plugins/auth.ts` accordingly.

## Environment files

```text
.env.example       # Development template
.env.test.example  # Test template
.env               # Development secrets; ignored
.env.test          # Test secrets; ignored
```

Use separate development and test databases. Configuration is validated in `src/config`; do not read `process.env` elsewhere.

## Vercel

Deploys as its own Vercel project with **Root Directory set to the repository root**, not `apps/api` — the Vercel function entry (`api/index.ts`) and `vercel.json` both live at the repo root, outside this package.

Root-level `api/index.ts` forwards Vercel requests to this Fastify app, and `vercel.json` routes every request to it.

Required environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `REDIS_URL`
- `CORS_ORIGIN` — the web app's origin; required in production since web and site deploy as separate Vercel projects/origins

See the root README's Vercel Deployment section for the full three-project (API, web, site) setup.
