# Docker

This project runs entirely in Docker for local development. The setup includes the API, Vue application, Nuxt site, PostgreSQL database, Redis, and Drizzle Studio.

## Services

| Service        | URL                    | Description                      |
| -------------- | ---------------------- | -------------------------------- |
| API (Fastify)  | https://localhost:3000 | Backend API with hot reload      |
| Web (Vue 3)    | https://localhost:5173 | Application with Vite HMR        |
| Site (Nuxt 4)  | https://localhost:8000 | Public site with Nuxt hot reload |
| Drizzle Studio | http://localhost:4983  | Visual database browser          |
| PostgreSQL     | localhost:5433         | Database                         |
| Redis          | localhost:6380         | Rate-limit store                 |

API, web, and site serve HTTPS with a locally-trusted cert — see [Local HTTPS certs](#local-https-certs) below before your first run.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)
- Bash for `pnpm docker:up`, `pnpm docker:rebuild`, `pnpm docker:rebuild:all`, and `pnpm docker:reset` (they initialize local API configuration, create the Docker database credential, and check the HTTPS cert first). On Windows, run them from WSL or Git Bash; from native PowerShell/CMD, run `bash scripts/ensure-docker-env.sh` and `pnpm generate:certificates` before using the equivalent `docker compose` commands directly.

## Local HTTPS certs

API, web, and site all serve HTTPS using one locally-trusted certificate. Mint it once, on the host, before your first `docker compose up`:

```bash
pnpm generate:certificates
```

This installs a CA into your OS/browser trust store, writes the certificate, then exits on its own (no dev server left running, no Ctrl+C needed). `pnpm docker:up`, `pnpm docker:rebuild`, `pnpm docker:rebuild:all`, and `pnpm docker:reset` run it automatically when the cert is missing; a bare `docker compose up` does not, so run it yourself first.

Two directories are involved, and the split matters:

| Path                    | Holds                                        | Reaches containers?                            |
| ----------------------- | -------------------------------------------- | ---------------------------------------------- |
| `~/.vite-plugin-mkcert` | CA root (`rootCA-key.pem`) + `mkcert` binary | **Never**                                      |
| `<repo>/.certs`         | Leaf `dev.pem` + `cert.pem` for `localhost`  | Yes — those two files only, bind-mounted `:ro` |

The CA private key can sign a certificate your browser trusts for _any_ domain, so it stays on the host: containers only ever see the leaf key/cert, read-only, mounted file-by-file rather than as a directory. Both paths are outside version control (`.certs/` is gitignored; `~/.vite-plugin-mkcert` is outside the repo entirely). The home directory is resolved through Node's `os.homedir()`, so this works on Windows (`%USERPROFILE%`) as well as macOS and Linux.

Notes:

- Nothing mints a certificate inside a container any more. A container-minted CA can only be trusted inside that container, so it bought a "Not Secure" browser warning and nothing else.
- If the cert is missing, all three services simply fall back to HTTP rather than serving something untrusted.
- **Upgrading an existing checkout:** older versions kept the CA root in `.certs/`. `pnpm generate:certificates` relocates it to `~/.vite-plugin-mkcert`, so the CA your browser already trusts keeps working. If `~/.vite-plugin-mkcert` already holds a _different_ CA, it leaves both in place and tells you — deleting a CA key that's installed in your keychain isn't something a script should decide for you. Certificates are then signed by the `~/.vite-plugin-mkcert` one; delete `.certs/rootCA*.pem` by hand once you're sure nothing else uses it.

## Getting Started

### 1. Start all services

```bash
pnpm docker:rebuild:all
```

On subsequent runs (no Dockerfile changes):

```bash
pnpm docker:up
```

Both create an ignored root `.env` with a random per-developer PostgreSQL password and mint the local HTTPS cert if needed. The plain `docker compose up --build` / `docker compose up` equivalents work too, but only after running `bash scripts/ensure-docker-env.sh` and `pnpm generate:certificates` at least once.

The first time `POSTGRES_DB` isn't yet set in the root `.env`, `ensure-docker-env.sh` prompts for a database name (`Postgres database name [monorepo_fastify_vue]:`) when run from an interactive terminal — press Enter to accept the default, or type a name using letters, digits, and underscores. To skip the prompt, either pass it on the command line (`POSTGRES_DB=acme_app pnpm docker:up`) or run non-interactively (CI, piped input), where the default is used automatically. Once `POSTGRES_DB` exists in `.env`, every later `docker:up`, `docker:reset`, or `docker:rebuild*` run reuses it silently; edit `.env` directly to change it afterward, then run `pnpm docker:reset` if the Postgres volume already exists (see below).

On a fresh clone, the same pre-Docker script also creates `apps/api/.env` and
`apps/api/.env.test` from their example files, replaces the checked-in JWT
placeholders with random secrets, and configures their host-facing database
URLs from the generated root `.env`:

```env
# apps/api/.env
DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5433/monorepo_fastify_vue

# apps/api/.env.test
DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5433/monorepo_fastify_vue_test
```

Both database names derive from `POSTGRES_DB` in the root `.env`: the
development database uses that value verbatim and the test database appends a
`_test` suffix. Overriding `POSTGRES_DB` therefore renames both consistently,
and the Postgres init script, Compose's `TEST_DATABASE_URL`, and the test-only
guards in `apps/api/vitest.setup.ts` and `apps/api/drizzle.test.config.ts` all
follow that convention. The examples above show the default `POSTGRES_DB` value.

Compose overrides these URLs with container-network addresses for services
running in Docker. Host-run commands such as `pnpm test` still read
`apps/api/.env.test` directly, so `scripts/ensure-docker-env.sh` synchronizes
Docker-owned localhost URLs on every run. It preserves custom database URLs and
existing non-example JWT secrets. All three environment files are ignored and
must remain uncommitted.

Existing checkouts that initialized the Docker volume with the former `root/root` credential must recreate that development-only volume once with `pnpm docker:reset`, or rotate the existing database role manually before starting the new Compose configuration.

### 2. Run database migrations

Once the `api` service is running, apply migrations in a new terminal:

```bash
pnpm docker:db:migrate
```

The Postgres container also auto-creates a `<POSTGRES_DB>_test` database (`monorepo_fastify_vue_test` by default) on first boot (via `docker/postgres-init`, mounted at `/docker-entrypoint-initdb.d`). Because that init script runs only when the data volume is empty, changing `POSTGRES_DB` on an existing checkout requires `pnpm docker:reset` to recreate the volume. Apply migrations to the test database separately before running tests:

```bash
pnpm docker:db:migrate:test
```

See [Database migrations](#database-migrations) below for when to use these Docker-specific commands versus the plain `pnpm db:migrate` / `pnpm db:migrate:test`.

### 3. Access the services

- **API docs (Scalar, development only):** https://localhost:3000
- **Vue application:** https://localhost:5173
- **Nuxt site:** https://localhost:8000
- **Drizzle Studio:** http://localhost:4983

## pgAdmin 4

Run pgAdmin outside Docker, then register the Docker PostgreSQL server:

1. Right-click **Servers** → **Register** → **Server**
2. **General** tab — Name: `monorepo-fastify-vue` (or anything)
3. **Connection** tab:

| Field    | Value                                                                         |
| -------- | ----------------------------------------------------------------------------- |
| Host     | localhost                                                                     |
| Port     | 5433                                                                          |
| Database | Value of `POSTGRES_DB` in the root `.env` (`monorepo_fastify_vue` by default) |
| Username | Value of `POSTGRES_USER` in the root `.env`                                   |
| Password | Value of `POSTGRES_PASSWORD` in the root `.env`                               |

## Drizzle Studio

Open http://localhost:4983 to browse and edit your database visually. It connects automatically using the `DATABASE_URL` environment variable. Studio is intentionally published only on `127.0.0.1`; do not expose it through a public proxy because it provides privileged database access.

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

External clients such as RedisInsight can connect to `localhost:6380`. Docker services connect to `redis:6379`. The unauthenticated development instance is bound only to `127.0.0.1`, so it is not reachable from other network hosts.

## Environment Variables

The API service loads shared application configuration and local secrets from the uncommitted `apps/api/.env` file through Compose `env_file`. This includes settings such as `JWT_SECRET`, `LOG_LEVEL`, `CORS_ORIGIN`, `PORT`, and `NODE_ENV`. The `scripts/ensure-docker-env.sh` bootstrap creates the ignored root `.env` with the Docker-only `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` values, and initializes or synchronizes the ignored API environment files as described above. Generated passwords are unique to the checkout, and all managed environment files use mode `0600`.

Compose declares only Docker-specific overrides under `environment`:

| Variable            | Value                                              | Description                                              |
| ------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`      | Constructed from the root `.env` PostgreSQL values | PostgreSQL connection string (container-network address) |
| `TEST_DATABASE_URL` | Same credential, targeting `<POSTGRES_DB>_test`    | Test migration connection string                         |
| `REDIS_URL`         | `redis://redis:6379`                               | Redis connection string (container-network address)      |

Values under `environment` take precedence over matching values from `env_file`. This lets the same `.env` use host addresses when the API runs directly while Compose replaces them with container-network addresses. See the [Docker Compose `environment` documentation](https://docs.docker.com/reference/compose-file/services/#environment).

Drizzle Studio receives only its Docker-specific `DATABASE_URL`; it does not load the API's `.env` or application secrets. PostgreSQL, Redis, and Studio host ports are all loopback-only.

The Nuxt development service sets `NITRO_PORT=8000` so it does not conflict with the API on port 3000. The site currently requires no application secrets.

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
docker compose build site
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
docker compose logs -f site
docker compose logs -f postgres
```

### Individual services

```bash
# Start only the database
docker compose up postgres

# Start only the API and its dependencies
docker compose up api

# Start only the Nuxt site
docker compose up site
```

## Database migrations

Always use `pnpm docker:db:migrate` for the development database when developing locally with Docker. Use `pnpm docker:db:migrate:test` for the Docker-hosted `<POSTGRES_DB>_test` database before running tests after migrations change. The non-Docker `pnpm db:migrate` and `pnpm db:migrate:test` commands are for environments whose database URLs are available directly from the host.

`pnpm docker:reset` removes the PostgreSQL volume, rebuilds every service, and migrates both the development and test databases. Use it only when discarding local database data is intended.

## Volumes

One named volume persists data between container restarts:

| Volume          | Used by    | Contains          |
| --------------- | ---------- | ----------------- |
| `postgres_data` | `postgres` | All database data |

Source code is mounted directly from the host, so edits to `apps/api/src`, `apps/web/src`, and `apps/site/app` are reflected immediately without rebuilding.

## Hot Reload

| Service | Mechanism                                                            |
| ------- | -------------------------------------------------------------------- |
| API     | `tsx watch` — restarts on any `.ts` file change under `apps/api/src` |
| Web     | Vite HMR — updates the browser instantly on save                     |
| Site    | Nuxt HMR — updates the browser for changes under `apps/site/app`     |

## Production Build

The Dockerfiles include a `production` target. To build production images locally:

```bash
# API production image
docker build -f apps/api/Dockerfile --target production -t monorepo-fastify-vue-api .

# Web production image (outputs static files served by nginx)
docker build -f apps/web/Dockerfile --target production -t monorepo-fastify-vue-web .

# Nuxt site production image (outputs static files served by nginx)
docker build -f apps/site/Dockerfile --target production -t monorepo-fastify-vue-site .
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
docker compose build web
docker compose build site
```

**Browser shows "Not Secure" / privacy error on https://localhost:5173 (or :8000, :3000)**
Usually the cert was replaced after the browser cached the old one's TLS state. Fix: `docker compose down`, `rm -rf .certs`, `pnpm generate:certificates`, then `pnpm docker:up`. Reload the browser tab (or close and reopen it) afterward. See [Local HTTPS certs](#local-https-certs).

**A service serves HTTP when you expected HTTPS**
`.certs/dev.pem` and `.certs/cert.pem` were missing when that container started — each service checks for them once at startup, not per request. Run `pnpm generate:certificates`, then recreate the containers with `pnpm docker:up`. (`docker compose restart` is not enough: bind mounts are resolved when a container is _created_.)

**`.certs/dev.pem` is a directory**
A bare `docker compose up` ran before the cert existed, and Docker created a directory in place of the missing mount source. Fix: `docker compose down`, `rm -rf .certs`, `pnpm docker:up` (which mints the cert first). The `pnpm docker:*` scripts guard against this; plain `docker compose` commands don't.
