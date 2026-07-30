# Docker

This project runs entirely in Docker for local development. The setup includes the API, web frontend, PostgreSQL database, Redis, and Drizzle Studio.

## Services

| Service        | URL                   | Description                       |
| -------------- | --------------------- | --------------------------------- |
| API (Fastify)  | http://localhost:3000 | Backend API with hot-reload       |
| Web (Vue 3)    | http://localhost:5173 | Frontend with Vite dev server     |
| Drizzle Studio | http://localhost:4983 | Visual database browser           |
| PostgreSQL     | localhost:5433        | Database                          |
| Redis          | localhost:6380        | Rate-limit store                  |

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)

## Getting Started

### 1. Start all services

```bash
docker compose up --build
```

On subsequent runs (no Dockerfile changes), omit `--build`:

```bash
docker compose up
```

### 2. Run database migrations

Once the `api` service is running, apply migrations in a new terminal:

```bash
pnpm docker:db:migrate
```

The Postgres container also auto-creates a `fastify_vue_test` database on first boot (via `docker/postgres-init`, mounted at `/docker-entrypoint-initdb.d`). Apply migrations to it separately before running tests:

```bash
pnpm docker:db:migrate:test
```

See [Database migrations](#database-migrations) below for when to use these Docker-specific commands versus the plain `pnpm db:migrate` / `pnpm db:migrate:test`.

### 3. Access the services

- **API docs (Scalar, development only):** http://localhost:3000
- **Drizzle Studio:** http://localhost:4983

## pgAdmin 4

Run pgAdmin outside Docker, then register the Docker PostgreSQL server:

1. Right-click **Servers** → **Register** → **Server**
2. **General** tab — Name: `monorepo-fastify-vue` (or anything)
3. **Connection** tab:

| Field    | Value       |
| -------- | ----------- |
| Host     | localhost   |
| Port     | 5433        |
| Database | fastify_vue |
| Username | root        |
| Password | root        |

## Drizzle Studio

Open http://localhost:4983 to browse and edit your database visually. It connects automatically using the `DATABASE_URL` environment variable.

## Redis

Open the built-in CLI:

```bash
docker compose exec redis redis-cli
```

Useful commands:

```text
PING
SCAN 0
GET key_name
```

External clients such as RedisInsight can connect to `localhost:6380`. Docker services connect to `redis:6379`.

## Environment Variables

The API service loads shared application configuration and local secrets from the uncommitted `apps/api/.env` file through Compose `env_file`. This includes settings such as `JWT_SECRET`, `LOG_LEVEL`, `CORS_ORIGIN`, `PORT`, and `NODE_ENV`.

Compose declares only Docker-specific overrides under `environment`:

| Variable       | Value                                              | Description                  |
| -------------- | -------------------------------------------------- | ---------------------------- |
| `DATABASE_URL` | `postgresql://root:root@postgres:5432/fastify_vue` | PostgreSQL connection string (container-network address) |
| `REDIS_URL`    | `redis://redis:6379`                               | Redis connection string (container-network address) |

Values under `environment` take precedence over matching values from `env_file`. This lets the same `.env` use host addresses when the API runs directly while Compose replaces them with container-network addresses. See the [Docker Compose `environment` documentation](https://docs.docker.com/reference/compose-file/services/#environment).

Drizzle Studio receives only its Docker-specific `DATABASE_URL`; it does not load the API's `.env` or application secrets.

Keep `apps/api/.env` and `apps/api/.env.test` uncommitted. Maintain non-secret development defaults in their checked-in example files, and use the deployment platform's secret management for production.

## Common Commands

### Start / Stop

```bash
# Start all services in the foreground
docker compose up

# Start in the background (detached)
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes (wipes the database)
docker compose down -v
```

### Rebuilding

```bash
# Rebuild all images (after Dockerfile or dependency changes)
docker compose up --build

# Rebuild a single service
docker compose build api
docker compose build web
```

### Running commands inside a container

```bash
# Open a shell in the API container
docker compose exec api sh

# Run a pnpm script in the API
docker compose exec api pnpm --filter @monorepo-fastify-vue/api <script>

# Generate a new migration
docker compose exec api pnpm --filter @monorepo-fastify-vue/api db:generate

# Apply migrations
pnpm docker:db:migrate
pnpm docker:db:migrate:test
```

### Logs

```bash
# Follow logs for all services
docker compose logs -f

# Follow logs for a specific service
docker compose logs -f api
docker compose logs -f postgres
```

### Individual services

```bash
# Start only the database
docker compose up postgres

# Start only the API and its dependencies
docker compose up api
```

## Database migrations

Always use `pnpm docker:db:migrate` for the development database when developing locally with Docker. Use `pnpm docker:db:migrate:test` for the Docker-hosted `fastify_vue_test` database before running tests after migrations change. The non-Docker `pnpm db:migrate` and `pnpm db:migrate:test` commands are for environments whose database URLs are available directly from the host.

`pnpm docker:reset` removes the PostgreSQL volume, rebuilds every service, and migrates both the development and test databases. Use it only when discarding local database data is intended.

## Volumes

One named volume persists data between container restarts:

| Volume          | Used by    | Contains          |
| --------------- | ---------- | ----------------- |
| `postgres_data` | `postgres` | All database data |

Source code is mounted directly from the host, so edits to `apps/api/src` and `apps/web/src` are reflected immediately without rebuilding.

## Hot Reload

| Service | Mechanism                                                            |
| ------- | -------------------------------------------------------------------- |
| API     | `tsx watch` — restarts on any `.ts` file change under `apps/api/src` |
| Web     | Vite HMR — updates the browser instantly on save                     |

## Production Build

The Dockerfiles include a `production` target. To build production images locally:

```bash
# API production image
docker build -f apps/api/Dockerfile --target production -t monorepo-fastify-vue-api .

# Web production image (outputs static files served by nginx)
docker build -f apps/web/Dockerfile --target production -t monorepo-fastify-vue-web .
```

## Troubleshooting

**Port already in use**
Another process is using one of the required ports. Find and stop it, or change the host-side port in `docker-compose.yml` (e.g. `"3001:3000"`).

**API fails to start with database errors**
The `api` service waits for the `postgres` healthcheck to pass before starting. If it still fails, check postgres logs:

```bash
docker compose logs postgres
```

**Drizzle Studio shows no tables**
Migrations have not been applied yet. Run:

```bash
pnpm docker:db:migrate
```

**Changes to `package.json` or `pnpm-lock.yaml` not picked up**
These are baked into the image at build time. Rebuild the affected service:

```bash
docker compose build api
```
