# Fastify + Vue starter

A health-only pnpm workspace starter with a Fastify API, Vue 3/Vite web app, a generated OpenAPI client, and PostgreSQL through Drizzle ORM.

## What is included

- `GET /api/v1/health/live` for process liveness
- `GET /api/v1/health/ready` for PostgreSQL readiness
- A single health page at `/` with automatic and manual refresh
- Fastify compression, Helmet, OpenAPI, static SPA hosting, and generic error handling
- Vue 3, Nuxt UI, Pinia, and Pinia Colada
- PostgreSQL, Drizzle Kit migrations, and Drizzle Studio

## Workspace

```text
apps/api                 Fastify API
apps/web                 Vue/Vite client
packages/api-client      Generated, typed OpenAPI client
packages/eslint-config   Shared ESLint configuration
```

API domains live under `apps/api/src/modules/<domain>`. Web features live under `apps/web/src/features/<feature>`. The starter contains only the `health` domain and feature.

## Requirements

- Node.js 24 (see `.nvmrc`)
- pnpm 11
- PostgreSQL 18, or Docker

## Local development

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
pnpm dev
```

The web app runs at `http://localhost:5173` and proxies `/api` to the API at `http://localhost:3000`. In development, Scalar API documentation is available at `http://localhost:3000`.

## Commands

```bash
pnpm lint
pnpm build
pnpm test
pnpm api-client:generate
pnpm api-client:check
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

`pnpm api-client:generate` writes `apps/api/openapi.json` and `packages/api-client/src/schema.d.ts`. Commit both generated files when the public API changes.

The migration directory intentionally starts empty. Adding future module-owned tables and running `pnpm db:generate` creates the first starter migration; it does not remove tables left behind in an existing database.

See [DOCKER.md](DOCKER.md) for the container workflow.
