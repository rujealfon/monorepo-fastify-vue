# Fastify + Vue / Vite + PostgreSQL + pnpm workspaces monorepo

A monorepo setup using pnpm workspaces with a Fastify API and Vue / Vite client backed by a local PostgreSQL database.

## Features

- Run tasks in parallel across apps / packages with pnpm
- Fastify API [proxied with Vite](./apps/web/vite.config.ts) during development
- Single-project Vercel deployment: Vue is built to `dist/`, and `/api/*` is handled by Fastify through a Vercel function
- OpenAPI spec generated from the same Zod schemas via `fastify-type-provider-zod` (`/openapi.json`, Swagger UI at `/documentation`)
- Shared Zod validators with drizzle-zod
- Shared ESLint config
- Shared tsconfig

## Tech Stack

**api**
- [Fastify](https://fastify.dev/) on Node.js
- `fastify-type-provider-zod` + `@fastify/swagger` + `@fastify/swagger-ui`
- Drizzle ORM + drizzle-zod
- PostgreSQL (`pg`)
- `@fastify/sensible`

**web**
- Vue 3
- Vite
- Vue Router
- VeeValidate + Zod

**dev tooling**
- TypeScript
- ESLint with `@antfu/eslint-config`
- Vitest

## Project Structure

```
.
├── api/             # Vercel serverless entry for the one-project deploy
├── apps/
│   ├── api/          # Fastify REST API (Node.js)
│   └── web/          # Vue / Vite frontend
└── packages/
    ├── api-client/   # Typed API client generated from the OpenAPI spec (openapi-fetch)
    └── eslint-config/ # Shared ESLint config
```

> **Note:** `packages/api-client` used to wrap Hono's RPC client (`hc<router>()`), which has no Fastify equivalent. It's now built on [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/), typed from `apps/api/openapi.json`. Auth-related calls in `apps/web` (`useAuth`) still throw "not implemented" — the auth module hasn't been rebuilt on the Fastify API yet.

**Regenerating the client after changing API routes/schemas:**

```sh
pnpm --filter @monorepo-fastify-vue/api openapi:generate       # refreshes apps/api/openapi.json
pnpm --filter @monorepo-fastify-vue/api-client types:generate  # refreshes packages/api-client/src/schema.d.ts
```

### API folder structure

The API uses a **feature-first** layout with a three-layer architecture. Each domain lives in `src/modules/<domain>/` and owns all of its layers. Currently only the `tasks` module is implemented (used as the reference pattern for future domains, e.g. auth/profile).

```
apps/api/src/
├── app.ts                          # buildApp() factory — plugins, Zod type provider, OpenAPI, error handler, routes
├── server.ts                       # Entry point — calls buildApp() and listens
├── config/
│   └── index.ts                    # Zod-validated env config (crashes on boot if invalid)
├── db/
│   ├── index.ts                    # Drizzle client
│   ├── migrations/                 # Generated SQL migrations
│   └── schema/
│       └── index.ts                # Barrel re-export for drizzle-kit
├── plugins/
│   ├── sensible.ts                 # @fastify/sensible
│   └── db.ts                       # Decorates fastify.db, closes pool on shutdown
└── modules/
    └── tasks/
        ├── tasks.schema.ts         # tasks table + drizzle-zod schemas (insert/patch/select)
        ├── tasks.errors.ts         # TaskNotFoundError
        ├── tasks.repository.ts     # Drizzle queries
        ├── tasks.service.ts        # Business logic
        ├── tasks.routes.ts         # Fastify route registration (Zod type provider)
        ├── tasks.handlers.ts       # HTTP layer
        └── __tests__/
            ├── tasks.handlers.test.ts   # Integration — full HTTP round-trip via app.inject()
            ├── tasks.service.test.ts    # Unit — mocked repository
            └── tasks.repository.test.ts # Integration — real DB queries
```

```
apps/api/
├── .env.example          # Dev environment template
├── .env.test.example     # Test environment template
├── .env                  # Dev secrets (gitignored)
└── .env.test             # Test secrets (gitignored)
```

**Layer responsibilities:**

| Layer | File | Knows about |
| --- | --- | --- |
| Handler | `*.handlers.ts` | HTTP (`request`, `reply`, status codes); catches domain errors |
| Service | `*.service.ts` | Business rules; throws domain errors |
| Repository | `*.repository.ts` | Drizzle ORM, DB queries only |
| Schema | `*.schema.ts` | Drizzle table definition, Zod types |

Adding a new feature: create a folder under `modules/` with the same file structure, then register its routes in `app.ts`.

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
DATABASE_URL=postgresql://root:root@localhost:5432/fastify_vue

# .env.test
DATABASE_URL=postgresql://root:root@localhost:5432/fastify_vue_test
```

Both files also require:

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=development   # or test
LOG_LEVEL=info
```

### 3. Run DB migrations

```sh
# Dev database
pnpm db:generate
pnpm db:migrate

# Test database (run once after creating it)
DATABASE_URL=postgresql://root:root@localhost:5432/fastify_vue_test pnpm db:migrate
```

### 4. Start apps

```sh
pnpm dev
```

Visit [http://localhost:5173](http://localhost:5173)

All requests to `/api` are proxied to the Fastify server running on [http://localhost:3000](http://localhost:3000).

The OpenAPI spec is available at [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json), and Swagger UI at [http://localhost:3000/documentation](http://localhost:3000/documentation).

## Database

| Command | Description |
| --- | --- |
| `pnpm db:generate` | Generate migrations from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio |

## Tasks

### Lint

```sh
pnpm lint
```

### Test

```sh
pnpm test
```

Tests run against a real PostgreSQL database — make sure `DATABASE_URL` in `apps/api/.env.test` points to a running instance. Service-layer unit tests mock the repository and run without a database connection.

### Build

```sh
pnpm build
```

## Vercel Deployment

There are two valid deployment shapes:

- **One Vercel project**: current repo default. Vue and Fastify share one origin.
- **Two Vercel projects**: optional. Vue and Fastify deploy separately and communicate cross-origin.

### Option 1: one Vercel project

Project settings:

```text
Framework Preset: Other
Root Directory: .
Build Command: pnpm vercel-build
Output Directory: dist
Install Command: pnpm install
```

If Vercel does not accept `.` as the root directory, clear the Root Directory field.

Required environment variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
NODE_ENV=production
```

`pnpm vercel-build` runs:

```sh
pnpm build && pnpm db:migrate
```

Generate migration files locally with `pnpm db:generate`, commit them, and let Vercel apply them during deployment with its dashboard `DATABASE_URL`.

How routing works:

- `apps/web` builds the Vue app to root `dist/`
- root `vercel.json` sends all requests to `api/index.ts`
- `api/index.ts` forwards the request to Fastify
- Fastify serves `dist/index.html` for frontend routes and handles `/api/*`

No `VITE_API_BASE_URL` or CORS setting is needed because browser requests use the same origin:

```text
/              -> Vue app
/login         -> Vue app
/api/v1/tasks  -> Fastify API
/documentation -> Fastify Swagger UI
```

### Option 2: separate API and web projects

Use this only if you want independent deployments, domains, or scaling for API and web.

API project settings:

```text
Root Directory: apps/api
Build Command: pnpm build
```

API environment variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
NODE_ENV=production
# CORS_ORIGIN=https://your-web-project.vercel.app
```

Web project settings:

```text
Root Directory: apps/web
Build Command: pnpm build
Output Directory: dist
```

Web environment variables:

```env
VITE_API_BASE_URL=https://your-api-project.vercel.app
```

Two-project deployment also needs two code/config differences from the current one-project default:

- The web build must output to `apps/web/dist` instead of root `dist`.
- The API must allow the web project's origin with CORS, because browser requests are no longer same-origin. `CORS_ORIGIN` is commented in the API env examples until that mode is needed.

For this repo, keep the one-project deployment unless you have a concrete reason to split them.
