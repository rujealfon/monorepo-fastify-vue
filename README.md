# Fastify + Vue / Vite + Nuxt + PostgreSQL monorepo

A pnpm workspace with a Fastify API backed by PostgreSQL and Redis, a Vue / Vite application, and a separate Nuxt site.

## Features

- Run tasks in parallel across apps / packages with pnpm
- Fastify API [proxied with Vite](./apps/web/vite.config.ts) during development
- Separate Nuxt 4 site generated as static files with Nuxt UI
- Three independent Vercel projects (API, web, site), each on its own subdomain, communicating cross-origin
- OpenAPI spec generated from the same Zod schemas via `fastify-type-provider-zod`, with Scalar at `/` in development
- Module-owned Zod validators with drizzle-zod
- Shared ESLint config
- Shared tsconfig

## Tech Stack

**api**

- [Fastify](https://fastify.dev/) on Node.js
- `fastify-type-provider-zod` + `@fastify/swagger` + Scalar
- Drizzle ORM + drizzle-zod
- PostgreSQL (`pg`)
- `@fastify/sensible`

**web**

- Vue 3
- Vite
- Vue Router
- Pinia + Pinia Colada
- `@nuxt/ui` (component library, not the Nuxt framework)

**site**

- Nuxt 4
- Vue 3
- `@nuxt/ui`
- Static generation with `nuxt generate`

**dev tooling**

- TypeScript
- ESLint with `@antfu/eslint-config`
- Vitest

**planned**

- [Upstash QStash](https://upstash.com/docs/qstash) — background jobs / scheduled and delayed tasks, message queue for the serverless API
- [Cloudflare R2](https://developers.cloudflare.com/r2/) — object storage (file/image uploads), S3-compatible with no egress fees
- [Resend](https://resend.com/docs) — transactional email (verification, password reset, notifications)

Not yet integrated; noted here so future work builds toward these choices instead of picking ad hoc alternatives.

## Project Structure

```
.
├── api/             # Vercel serverless entry for the API project
├── apps/
│   ├── api/          # Fastify REST API (Node.js)
│   ├── site/         # Nuxt public site (statically generated)
│   └── web/          # Vue / Vite application
└── packages/
    ├── api-client/   # Typed API client generated from the OpenAPI spec (openapi-fetch)
    └── eslint-config/ # Shared ESLint config
```

Detailed structure and dependency rules live with each workspace:

- [Fastify API](./apps/api/README.md)
- [Nuxt site](./apps/site/README.md)
- [Vue web app](./apps/web/README.md)
- [Generated API client](./packages/api-client/README.md)
- [Shared ESLint config](./packages/eslint-config/README.md)

Regenerate the client after changing API routes or schemas:

```sh
pnpm api-client:generate
```

CI runs `pnpm api-client:check` and fails when the committed OpenAPI document or generated client types are stale.

> All pnpm commands are run from the root of the repo.

## Local Setup

### Prerequisites

- Node.js 24+
- pnpm
- PostgreSQL running locally (e.g. via [Postgres.app](https://postgresapp.com/) or Docker — see [DOCKER.md](./DOCKER.md))

### 1. Install dependencies

```sh
pnpm install
```

### 2. Configure environment

```sh
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
```

Edit `apps/api/.env` with your own dev database credentials, and `apps/api/.env.test` with a **separate** test database (so running tests never wipes dev data). Do not reuse a checked-in example password:

```env
# .env
DATABASE_URL=postgresql://<username>:<password>@localhost:5433/monorepo_fastify_vue

# .env.test
DATABASE_URL=postgresql://<username>:<password>@localhost:5433/monorepo_fastify_vue_test
```

Both files also require:

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=development   # or test
LOG_LEVEL=info          # use silent for tests
```

### 3. Run DB migrations

```sh
# Dev database
pnpm db:generate
pnpm db:migrate

# Test database (run once after creating it)
pnpm db:migrate:test
```

### 4. Start the workspaces

```sh
NITRO_PORT=8080 pnpm dev
```

The root command starts the API, Vue app, and Nuxt site in parallel. `NITRO_PORT` keeps Nuxt from conflicting with the API's default port.

- Vue application: [http://localhost:5173](http://localhost:5173)
- Nuxt site: [http://localhost:8080](http://localhost:8080)
- Fastify API and Scalar: [http://localhost:3000](http://localhost:3000)

To run the Nuxt site by itself on a fixed port:

```sh
pnpm --filter @monorepo-fastify-vue/site dev -- --port 8080
```

All requests to `/api` are proxied to the Fastify server running on [http://localhost:3000](http://localhost:3000).

In development, Scalar is available at [http://localhost:3000](http://localhost:3000) and its OpenAPI document at [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json). Neither documentation route is registered in production.

## Database

| Command                | Description                                   |
| ---------------------- | --------------------------------------------- |
| `pnpm db:generate`     | Generate migrations from schema changes       |
| `pnpm db:migrate`      | Apply pending migrations to the dev database  |
| `pnpm db:migrate:test` | Apply pending migrations to the test database |
| `pnpm db:studio`       | Open Drizzle Studio                           |

## Tasks

### Lint

```sh
pnpm lint
```

`pnpm install` enables the Husky pre-commit hook. It runs lint-staged and applies existing ESLint fixes only to staged API, web, site, and package files.

### Test

```sh
pnpm test
```

Tests run against a real PostgreSQL database — make sure `DATABASE_URL` in `apps/api/.env.test` points to a running instance. Service-layer unit tests mock the repository and run without a database connection.

### Build

```sh
pnpm build
```

This builds the API and Vue application and generates the Nuxt site in `apps/site/.output/public`.

## Vercel Deployment

Each app deploys as its own Vercel project, typically on subdomains of one registrable domain, e.g.:

```text
https://app.example.com   -> web  (apps/web)
https://api.example.com   -> api  (repository root)
https://example.com       -> site (apps/site)
```

Because `app.example.com` and `api.example.com` share the registrable domain `example.com`, browsers treat them as **same-site** (not cross-site) even though they're different origins — the session cookie's `SameSite=Strict` still gets sent between them. Cross-origin (different-origin) browser requests still need explicit CORS.

### API project

```text
Framework Preset: Other
Root Directory: . (repository root)
Build Command: pnpm build:vercel
Output Directory: public
Install Command: pnpm install
```

If Vercel does not accept `.` as the Root Directory, clear the field instead — both mean repository root.

The API has no static frontend, so `Output Directory` points at the checked-in empty `public/` directory purely to satisfy Vercel's build-output check; it plays no role in routing. Routing works like this:

- Root `vercel.json` rewrites every request to `/api?path=$1`
- Root `api/index.ts` is the single Vercel function; it reconstructs the original path from the `path` query param and hands it to Fastify's `buildApp()`
- Fastify handles `/api/v1/*` routes and returns its own JSON 404 for anything else

`pnpm build:vercel` runs:

```sh
pnpm --filter @monorepo-fastify-vue/api build && pnpm db:migrate
```

Generate migration files locally with `pnpm db:generate`, commit them, and let Vercel apply them during deployment.

Required environment variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=verify-full
JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters
NODE_ENV=production
REDIS_URL=rediss://default:PASSWORD@HOST:6379
CORS_ORIGIN=https://app.example.com
```

If `DATABASE_URL` is a pooled (PgBouncer) endpoint — e.g. Neon's default pooled connection string — also set:

```env
DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=verify-full
```

`pnpm db:migrate` (part of `build:vercel`) takes a session-scoped Postgres advisory lock, which transaction-mode PgBouncer doesn't support — `apps/api/drizzle.config.ts` uses `DATABASE_URL_UNPOOLED` for migrations when it's set, falling back to `DATABASE_URL` otherwise. Runtime queries always use `DATABASE_URL` (pooled is preferred there — Vercel's serverless functions open many short-lived concurrent connections, which a direct Postgres connection limit can't absorb). Get both connection strings from Neon's connection dialog by toggling "Connection pooling" on/off.

`CORS_ORIGIN` is required in production (validated in `apps/api/src/config`) — it's both the `@fastify/cors` allowlist and the extra origin the `sameOrigin` decorator (`apps/api/src/plugins/auth.ts`) accepts alongside same-host requests.

Use `rediss://` (TLS), not `redis://`, with Upstash — its endpoints enforce TLS ("TLS/SSL: Enabled" in the Upstash console), and `redis://` will fail to connect.

Upstash Redis (and similar providers) issue both a read/write **Token** and a **Readonly Token**. `REDIS_URL` must use the read/write Token — the only Redis consumer today is the `@fastify/rate-limit` store (`apps/api/src/plugins/security.ts`), which increments a counter on every request, so a readonly token would break it. Reach for the readonly token only if a second, read-only Redis consumer gets added later, e.g. a dashboard displaying rate-limit counters, a debug/inspection `redis-cli` session where accidental writes should fail, or a separate service reading data this API writes. No such consumer exists yet.

Fastify's built-in Pino logger writes structured logs to Vercel Runtime Logs. It defaults to `info`; set `LOG_LEVEL=warn` if routine request logs become noisy, and keep `silent` in `.env.test`. Do not log request bodies, cookies, authorization headers, passwords, or tokens. Add a Vercel Drain only when the dashboard's retention is insufficient or external alerting is required.

### Web project

```text
Root Directory: apps/web
Build Command: pnpm build
Output Directory: dist
Install Command: pnpm install
```

Enable "Include files outside the Root Directory in the Build Step" — the web app depends on the pnpm workspace root (lockfile, hoisted `node_modules`, `packages/api-client`).

No `VITE_API_BASE_URL` (or any API URL env var) is needed. `apps/web/vercel.json` rewrites `/api/*` to the API project's URL, so the browser always calls the web app's own origin — matching what `vite.config.ts`'s dev server proxy already does locally. This keeps every request same-origin regardless of whether web and API end up on unrelated domains, so update the `destination` in `apps/web/vercel.json` if the API project's URL changes.

### Site project

Create a Vercel project with `apps/site` as its Root Directory; its checked-in `vercel.json` runs `pnpm build` and publishes `.output/public`. No environment variables required.

### Direct requests between unrelated domains

The setup above assumes web and API share a registrable domain (subdomains of the same site), so `SameSite=Strict` keeps working. If the API and web instead live on genuinely unrelated domains (e.g. `app.example.com` calling `api.example.net`), the session cookie needs `SameSite=None; Secure` instead of `Strict` — and Safari/Chrome may still block it as a third-party cookie by default even with CORS configured correctly, since third-party cookie blocking is enforced independently of `SameSite`. See [MDN's credentialed CORS guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS#credentialed_requests_and_wildcards) and [WebKit's tracking-prevention policy](https://webkit.org/tracking-prevention/).

Bare `*.vercel.app` project URLs fall into this same bucket even though they look like subdomains of one site: `vercel.app` is on the [Public Suffix List](https://publicsuffix.org/), so browsers treat each `<project>.vercel.app` as its own registrable domain (`sec-fetch-site: cross-site`, not `same-site`). Don't reach for `SameSite=None` there — it depends on third-party cookies being allowed, which is exactly the setting Chrome and Safari are phasing out. Use the same-origin rewrite proxy described above (`apps/web/vercel.json`) instead; it works regardless of custom domains and needs no cookie relaxation at all. Reserve `SameSite=None` for cases where a rewrite proxy genuinely isn't an option.
