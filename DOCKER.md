# Docker development

Docker Compose runs the Vue web app, Fastify API, PostgreSQL, Redis, and Drizzle Studio.

## Services

| Service | Address |
| --- | --- |
| Web | `http://localhost:5173` |
| API | `http://localhost:3000` |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6380` |
| Drizzle Studio | `http://localhost:4983` |

## Setup

```bash
cp apps/api/.env.example apps/api/.env
docker compose up --build
pnpm docker:db:migrate
pnpm docker:db:migrate:test
```

## Environment configuration

The API service loads shared application configuration and local secrets from the uncommitted `apps/api/.env` file through Compose `env_file`. This includes settings such as `JWT_SECRET`, `LOG_LEVEL`, `CORS_ORIGIN`, `PORT`, and `NODE_ENV`.

Compose declares only Docker-specific overrides under `environment`:

- `DATABASE_URL` uses the `postgres` service hostname.
- `REDIS_URL` uses the `redis` service hostname.

Values under `environment` take precedence over matching values from `env_file`. This lets the same `.env` use host addresses when the API runs directly while Compose replaces them with container-network addresses. See the [Docker Compose `environment` documentation](https://docs.docker.com/reference/compose-file/services/#environment).

Drizzle Studio receives only its Docker-specific `DATABASE_URL`; it does not load the API's `.env` or application secrets. PostgreSQL data is stored in the `postgres_data` volume.

Keep `apps/api/.env` and `apps/api/.env.test` uncommitted. Maintain non-secret development defaults in their checked-in example files, and use the deployment platform's secret management for production.

## Database migrations

Always use `pnpm docker:db:migrate` for the development database when developing locally with Docker. Use `pnpm docker:db:migrate:test` for the Docker-hosted `fastify_vue_test` database before running tests after migrations change. The non-Docker `pnpm db:migrate` and `pnpm db:migrate:test` commands are for environments whose database URLs are available directly from the host.

## Useful commands

```bash
pnpm docker:start
pnpm docker:stop
pnpm docker:restart
pnpm docker:rebuild
pnpm docker:db:migrate
pnpm docker:db:migrate:test
docker compose logs -f api
```

`pnpm docker:reset` removes the PostgreSQL volume, rebuilds every service, and migrates both the development and test databases. Use it only when discarding local database data is intended.
