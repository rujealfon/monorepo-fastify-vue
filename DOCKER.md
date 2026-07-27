# Docker development

Docker Compose runs the Vue web app, Fastify API, PostgreSQL, and Drizzle Studio.

## Services

| Service | Address |
| --- | --- |
| Web | `http://localhost:5173` |
| API | `http://localhost:3000` |
| PostgreSQL | `localhost:5433` |
| Drizzle Studio | `http://localhost:4983` |

## Setup

```bash
cp apps/api/.env.example apps/api/.env
docker compose up --build
pnpm docker:db:migrate
```

The Compose API overrides `DATABASE_URL` with `postgresql://root:root@postgres:5432/fastify_vue`. PostgreSQL data is stored in the `postgres_data` volume.

Useful commands:

```bash
pnpm docker:start
pnpm docker:stop
pnpm docker:restart
pnpm docker:rebuild
pnpm docker:db:migrate
docker compose logs -f api
```

`pnpm docker:reset` removes the PostgreSQL volume and rebuilds every service. Use it only when discarding local database data is intended.
