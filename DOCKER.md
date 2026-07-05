# Docker

This project runs entirely in Docker for local development. The setup includes the API, web frontend, PostgreSQL database, Drizzle Studio, and pgAdmin 4.

## Services

| Service | URL | Description |
|---|---|---|
| API (Fastify) | http://localhost:3000 | Backend API with hot-reload |
| Web (Vue 3) | http://localhost:5173 | Frontend with Vite dev server |
| Drizzle Studio | http://localhost:4983 | Visual database browser |
| pgAdmin 4 | http://localhost:5050 | Full-featured DB admin UI |
| PostgreSQL | localhost:5432 | Database |

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
docker compose exec api pnpm --filter @monorepo-fastify-vue/api db:migrate
```

### 3. Access the services

- **API docs (Swagger UI):** http://localhost:3000/documentation
- **OpenAPI spec:** http://localhost:3000/openapi.json
- **Drizzle Studio:** http://localhost:4983
- **pgAdmin 4:** http://localhost:5050

## pgAdmin 4

Login at http://localhost:5050 with:

| Field | Value |
|---|---|
| Email | admin@admin.com |
| Password | admin |

### Connect to the database

1. Right-click **Servers** → **Register** → **Server**
2. **General** tab — Name: `monorepo-fastify-vue` (or anything)
3. **Connection** tab:

| Field | Value |
|---|---|
| Host | postgres |
| Port | 5432 |
| Database | fastify_vue |
| Username | root |
| Password | root |

> Use `postgres` as the host, not `localhost` — services communicate over the internal Docker network.

## Drizzle Studio

Open http://localhost:4983 to browse and edit your database visually. It connects automatically using the `DATABASE_URL` environment variable.

## Environment Variables

The API service uses these environment variables (set in `docker-compose.yml`):

| Variable | Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://root:root@postgres:5432/fastify_vue` | PostgreSQL connection string |
| `PORT` | `3000` | API server port |
| `NODE_ENV` | `development` | Runtime environment |

> For production, override these with real secrets and never commit them to version control.

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
docker compose exec api pnpm --filter @monorepo-fastify-vue/api db:migrate
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
# Start only the database and pgAdmin
docker compose up postgres pgadmin

# Start only the API and its dependencies
docker compose up api
```

## Volumes

Two named volumes persist data between container restarts:

| Volume | Used by | Contains |
|---|---|---|
| `postgres_data` | `postgres` | All database data |
| `pgadmin_data` | `pgadmin` | pgAdmin server/connection configs |

Source code is mounted directly from the host, so edits to `apps/api/src` and `apps/web/src` are reflected immediately without rebuilding.

## Hot Reload

| Service | Mechanism |
|---|---|
| API | `tsx watch` — restarts on any `.ts` file change under `apps/api/src` |
| Web | Vite HMR — updates the browser instantly on save |

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
docker compose exec api pnpm --filter @monorepo-fastify-vue/api db:migrate
```

**Changes to `package.json` or `pnpm-lock.yaml` not picked up**
These are baked into the image at build time. Rebuild the affected service:
```bash
docker compose build api
```
