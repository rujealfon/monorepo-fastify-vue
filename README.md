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

Edit `apps/api/.env` with your dev database credentials, and `apps/api/.env.test` with a **separate** test database (so running tests never wipes dev data):

```env
# .env
DATABASE_URL=postgresql://root:root@localhost:5433/monorepo_fastify_vue

# .env.test
DATABASE_URL=postgresql://root:root@localhost:5433/monorepo_fastify_vue_test
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

Generate migration files locally with `pnpm db:generate`, commit them, and let Vercel apply them during deployment with its dashboard `DATABASE_URL`.

Required environment variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters
NODE_ENV=production
REDIS_URL=rediss://default:PASSWORD@HOST:6379
CORS_ORIGIN=https://app.example.com
```

`CORS_ORIGIN` is required in production (validated in `apps/api/src/config`) — it's both the `@fastify/cors` allowlist and the extra origin the `sameOrigin` decorator (`apps/api/src/plugins/auth.ts`) accepts alongside same-host requests.

Fastify's built-in Pino logger writes structured logs to Vercel Runtime Logs. It defaults to `info`; set `LOG_LEVEL=warn` if routine request logs become noisy, and keep `silent` in `.env.test`. Do not log request bodies, cookies, authorization headers, passwords, or tokens. Add a Vercel Drain only when the dashboard's retention is insufficient or external alerting is required.

### Web project

```text
Root Directory: apps/web
Build Command: pnpm build
Output Directory: dist
Install Command: pnpm install
```

Enable "Include files outside the Root Directory in the Build Step" — the web app depends on the pnpm workspace root (lockfile, hoisted `node_modules`, `packages/api-client`).

```env
VITE_API_BASE_URL=https://api.example.com
```

### Site project

Create a Vercel project with `apps/site` as its Root Directory; its checked-in `vercel.json` runs `pnpm build` and publishes `.output/public`. No environment variables required.

### Direct requests between unrelated domains

The setup above assumes web and API share a registrable domain (subdomains of the same site), so `SameSite=Strict` keeps working. If the API and web instead live on genuinely unrelated domains (e.g. `app.example.com` calling `api.example.net`), the session cookie needs `SameSite=None; Secure` instead of `Strict`, and Safari/other browsers may still block it as a third-party cookie by default even with CORS configured correctly. See [MDN's credentialed CORS guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS#credentialed_requests_and_wildcards) and [WebKit's tracking-prevention policy](https://webkit.org/tracking-prevention/). Prefer subdomains of one registrable domain unless unrelated domains are a firm requirement.
