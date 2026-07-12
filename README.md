# Fastify + Vue / Vite + PostgreSQL + pnpm workspaces monorepo

A monorepo setup using pnpm workspaces with a Fastify API and Vue / Vite client backed by a local PostgreSQL database.

## Features

- Run tasks in parallel across apps / packages with pnpm
- Fastify API [proxied with Vite](./apps/web/vite.config.ts) during development
- Single-project Vercel deployment: Vue is built to `dist/`, and `/api/*` is handled by Fastify through a Vercel function
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

Detailed structure and dependency rules live with each workspace:

- [Fastify API](./apps/api/README.md)
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

In development, Scalar is available at [http://localhost:3000](http://localhost:3000) and its OpenAPI document at [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json). Neither documentation route is registered in production.

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

`pnpm install` enables the Husky pre-commit hook. It runs lint-staged and applies existing ESLint fixes only to staged API, web, and package files.

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
Build Command: pnpm build:vercel
Output Directory: dist
Install Command: pnpm install
```

If Vercel does not accept `.` as the root directory, clear the Root Directory field.

Required environment variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters
NODE_ENV=production
```

`pnpm build:vercel` runs:

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
/              -> Scalar API reference in development; Vue app in production
```

### Option 2: separate API and web projects

Use this only if you want independent deployments, domains, or scaling for API and web.

Separate projects do not have to mean cross-origin browser requests. The recommended setup keeps `/api/*` on the web origin and proxies those requests to the separately deployed API:

```text
Browser -> https://app.example.com/api/* -> https://api-provider.example/*
```

Configure the web host with a rewrite or reverse proxy for `/api/*` and leave `VITE_API_BASE_URL` unset. The browser continues to use the existing HTTP-only, `SameSite=Strict` session cookie, while web and API remain independently deployable. Confirm that the proxy forwards `Cookie`, `Set-Cookie`, `Origin`, and the original host/protocol headers.

API project settings:

```text
Root Directory: apps/api
Build Command: pnpm build
```

The current Vercel function entry is at the repository root for Option 1. Before using `apps/api` as an independent Vercel root, add an API-local function handler that creates the Fastify app with `buildApp()`, and route `/api/*` to it. Run committed Drizzle migrations as a separate deployment step against the API project's database.

API environment variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters
NODE_ENV=production
```

Web project settings:

```text
Root Directory: apps/web
Build Command: pnpm build
Output Directory: dist
```

No web environment variable is needed when `/api/*` is proxied through the web origin.

#### Direct requests between unrelated domains

If the browser must call the API domain directly, for example from `https://app.example.com` to `https://api.example.net`, set:

```env
# Web project
VITE_API_BASE_URL=https://your-api-project.vercel.app

# API project
CORS_ORIGIN=https://your-web-project.vercel.app
```

This mode is not enabled by the current code. It requires all of these changes:

- Register `@fastify/cors` with the exact `CORS_ORIGIN` and `credentials: true`; never use `*` with credentials.
- Create the API client with `credentials: 'include'`, otherwise cross-origin requests neither send cookies nor accept `Set-Cookie`.
- Change the session cookie to `HttpOnly; Secure; SameSite=None; Path=/`. Do not set `Domain`; the cookie belongs to the API host.
- Change the unsafe-request check to accept only the configured web `Origin`. A legitimate request is cross-site in this setup, so it cannot reject every `Sec-Fetch-Site: cross-site` request.
- Serve both projects over HTTPS.
- Build the web app to `apps/web/dist` instead of the root `dist`.

Credentialed CORS only permits the request; it does not override browser privacy rules. Safari blocks third-party cookies by default, and other browsers or user settings may do the same. A cross-site HTTP-only cookie can therefore fail even when CORS and `SameSite=None` are configured correctly. See [MDN's credentialed CORS guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS#credentialed_requests_and_wildcards) and [WebKit's tracking-prevention policy](https://webkit.org/tracking-prevention/).

Prefer the same-origin proxy above unless direct cross-domain browser access is a firm requirement. If third-party cookies must work reliably across unrelated domains, add a backend-for-frontend on the web origin or move to an OAuth authorization-code flow instead of storing tokens in browser storage.
