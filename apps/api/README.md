# API

The Fastify API currently exposes only:

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`

The readiness endpoint executes `select 1` through the retained Drizzle/PostgreSQL client and returns `503` when the database is unavailable.

Copy `.env.example` to `.env`, then run:

```bash
pnpm --filter @monorepo-fastify-vue/api dev
```

Generic infrastructure includes PostgreSQL, Helmet, compression, OpenAPI in development, static SPA hosting, and the shared error handler. Add future domains under `src/modules` and register them explicitly in `src/modules/index.ts`.
