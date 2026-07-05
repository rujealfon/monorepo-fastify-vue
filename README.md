# Hono + Vue / Vite + PostgreSQL + pnpm workspaces monorepo

A monorepo setup using pnpm workspaces with a Hono API and Vue / Vite client backed by a local PostgreSQL database.

## Features

- Run tasks in parallel across apps / packages with pnpm
- Hono API [proxied with Vite](./apps/web/vite.config.ts) during development
- Hono [RPC client](packages/api-client/src/index.ts) resolved directly from source for faster inference
- Shared Zod validators with drizzle-zod
- Shared ESLint config
- Shared tsconfig

## Tech Stack

**api**
- [Hono](https://hono.dev/) on Node.js via `@hono/node-server`
- Hono Zod OpenAPI + Scalar API reference
- Drizzle ORM + drizzle-zod
- PostgreSQL (`pg`)
- stoker
- bcryptjs (password hashing)
- JWT via `hono/jwt`

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
│   ├── api/          # Hono REST API (Node.js)
│   └── web/          # Vue / Vite frontend
└── packages/
    ├── api-client/   # Type-safe Hono RPC client
    └── eslint-config/ # Shared ESLint config
```

### API folder structure

The API uses a **feature-first** layout with a three-layer architecture. Each domain lives in `src/modules/<domain>/` and owns all of its layers.

```
apps/api/src/
├── app.ts                          # App factory, global middleware, OpenAPI setup
├── index.ts                        # Server entry point
├── config/
│   └── index.ts                    # Zod-validated env config (crashes on boot if invalid)
├── db/
│   ├── index.ts                    # Drizzle client
│   ├── migrations/                 # Generated SQL migrations
│   └── schema/
│       └── index.ts                # Barrel re-export for drizzle-kit
├── events/
│   └── index.ts                    # In-process event bus (Node EventEmitter)
├── jobs/
│   └── index.ts                    # Job dispatcher (swap for BullMQ in production)
├── lib/
│   ├── configure-open-api.ts       # Scalar API docs
│   ├── constants.ts                # Shared constants
│   ├── create-app.ts               # App + test app factories
│   ├── create-router.ts            # OpenAPIHono factory
│   └── types.ts                    # AppEnv, JwtPayload, AppRouteHandler
├── middleware/
│   ├── auth.ts                     # JWT guard (hono/jwt)
│   ├── logger.ts                   # Request logger
│   └── rate-limit.ts               # In-memory rate limiter
└── modules/
    ├── index.ts                    # Registers all routers; applies route-level middleware
    ├── index.route.ts              # Root GET /
    ├── auth/
    │   ├── auth.schema.ts          # users table + Zod schemas
    │   ├── auth.errors.ts          # UserAlreadyExistsError, InvalidCredentialsError
    │   ├── auth.repository.ts      # User DB queries
    │   ├── auth.service.ts         # register / login business logic
    │   ├── auth.routes.ts          # OpenAPI route definitions
    │   ├── auth.handlers.ts        # HTTP layer
    │   └── auth.index.ts           # Router wiring
    └── tasks/
        ├── tasks.schema.ts         # tasks table + Zod schemas
        ├── tasks.types.ts          # Domain types (TaskSortField, TaskFilters)
        ├── tasks.errors.ts         # TaskNotFoundError
        ├── tasks.repository.ts     # Drizzle queries
        ├── tasks.service.ts        # Business logic + event emission
        ├── tasks.routes.ts         # OpenAPI route definitions
        ├── tasks.handlers.ts       # HTTP layer — catches domain errors, maps to status codes
        ├── tasks.index.ts          # Router wiring
        └── __tests__/
            ├── tasks.handlers.test.ts   # Integration — full HTTP round-trip
            ├── tasks.service.test.ts    # Unit — mocked repository
            └── tasks.repository.test.ts # Integration — real DB queries
```

> `src/test/setup.ts` loads `.env.test` before any module code runs, ensuring tests always hit the test database.

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
| Handler | `*.handlers.ts` | HTTP (`c.req`, `c.json`, status codes); catches domain errors |
| Service | `*.service.ts` | Business rules, event emission; throws domain errors |
| Repository | `*.repository.ts` | Drizzle ORM, DB queries only |
| Schema | `*.schema.ts` | Drizzle table definition, Zod types |

**Auth flow:**

| Endpoint | Access | Description |
| --- | --- | --- |
| `POST /api/v1/auth/register` | Public | Create account, returns JWT |
| `POST /api/v1/auth/login` | Public | Login, returns JWT |

Adding a new feature: create a folder under `modules/` with the same file structure, then register its router in `modules/index.ts`.

> All pnpm commands are run from the root of the repo.

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL running locally (e.g. via [Postgres.app](https://postgresapp.com/) or Docker)

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
DATABASE_URL=postgresql://postgres:password@localhost:5432/tech_full_stack

# .env.test
DATABASE_URL=postgresql://postgres:password@localhost:5432/tech_full_stack_test
```

Both files also require:

```env
PORT=8787

# Generate with: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_EXPIRES_IN_DAYS=7
```

### 3. Run DB migrations

```sh
# Dev database
pnpm db:generate
pnpm db:migrate

# Test database (run once after creating it)
DATABASE_URL=postgresql://postgres:password@localhost:5432/tech_full_stack_test pnpm db:migrate
```

### 4. Start apps

```sh
pnpm dev
```

Visit [http://localhost:5173](http://localhost:5173)

All requests to `/api` are proxied to the Hono server running on [http://localhost:8787](http://localhost:8787).

The API reference (Scalar) is available at [http://localhost:8787/api/v1/scalar](http://localhost:8787/api/v1/scalar).

In production (`pnpm start`), [http://localhost:8787](http://localhost:8787) serves the Vue app and `/scalar` serves the API docs.

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

Tests run against a real PostgreSQL database — make sure `DATABASE_URL` in `apps/api/.env` points to a running instance. Service-layer unit tests mock the repository and run without a database connection.

### Build

```sh
pnpm build
```
