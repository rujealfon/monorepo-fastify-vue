# Fastify + Vue / Vite + PostgreSQL + pnpm workspaces monorepo

A monorepo setup using pnpm workspaces with a Fastify API and Vue / Vite client backed by a local PostgreSQL database.

## Features

- Run tasks in parallel across apps / packages with pnpm
- Fastify API [proxied with Vite](./apps/web/vite.config.ts) during development
- tRPC end-to-end types — the client imports the server's router type directly, no codegen step, no schema drift
- Shared Zod validators with drizzle-zod
- Shared ESLint config
- Shared tsconfig

## Tech Stack

**api**
- [Fastify](https://fastify.dev/) on Node.js
- [tRPC](https://trpc.io/) (`@trpc/server`, Fastify adapter) for the RPC layer
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
├── apps/
│   ├── api/          # Fastify REST API (Node.js)
│   └── web/          # Vue / Vite frontend
└── packages/
    ├── api-client/   # tRPC client — imports the server's AppRouter type directly
    └── eslint-config/ # Shared ESLint config
```

> **Note:** `packages/api-client` used to wrap Hono's RPC client (`hc<router>()`), which has no Fastify equivalent. An interim version used `openapi-fetch` + a generated OpenAPI spec, but that required a manual codegen step to stay in sync. It's now built on [tRPC](https://trpc.io/) instead: `import type { AppRouter } from "@monorepo-fastify-vue/api/router"` gives the client live type inference straight from the server source — same idea as Hono's `hc<router>()`, no generated files, nothing to run before types are fresh. Auth-related calls in `apps/web` (`useAuth`) still throw "not implemented" — the auth module hasn't been rebuilt on the Fastify API yet.

### API folder structure

The API uses a **feature-first** layout with a three-layer architecture. Each domain lives in `src/modules/<domain>/` and owns all of its layers. Currently only the `tasks` module is implemented (used as the reference pattern for future domains, e.g. auth/profile).

```
apps/api/src/
├── app.ts                          # buildApp() factory — plugins, tRPC mount, error handler
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
├── trpc/
│   ├── trpc.ts                     # initTRPC instance — router/publicProcedure
│   ├── context.ts                  # createContext for the Fastify adapter
│   └── router.ts                   # appRouter — combines per-module routers; exports AppRouter type
└── modules/
    └── tasks/
        ├── tasks.schema.ts         # tasks table + drizzle-zod schemas (insert/patch/select)
        ├── tasks.errors.ts         # TaskNotFoundError
        ├── tasks.repository.ts     # Drizzle queries
        ├── tasks.service.ts        # Business logic
        ├── tasks.router.ts         # tRPC procedures (list/getOne/create/patch/remove)
        └── __tests__/
            ├── tasks.router.test.ts     # Integration — procedures via router.createCaller()
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
| Router | `*.router.ts` | tRPC procedures — input validation, calls service, maps domain errors to `TRPCError` |
| Service | `*.service.ts` | Business rules; throws domain errors |
| Repository | `*.repository.ts` | Drizzle ORM, DB queries only |
| Schema | `*.schema.ts` | Drizzle table definition, Zod types |

Adding a new feature: create a folder under `modules/` with the same file structure, then add its router to `src/trpc/router.ts`.

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

All requests to `/trpc` are proxied to the Fastify server running on [http://localhost:3000](http://localhost:3000).

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
