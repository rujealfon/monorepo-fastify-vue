# @tech-full-stack/api

Hono REST API running on Node.js with PostgreSQL via Drizzle ORM, OpenAPI documentation, and Auth.js for GitHub OAuth.

## Included

- Type-safe routes with [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- Interactive API docs with [Scalar](https://scalar.com/) / [@scalar/hono-api-reference](https://github.com/scalar/scalar/tree/main/packages/hono-api-reference)
- Convenience helpers with [stoker](https://www.npmjs.com/package/stoker)
- Single source of truth schemas with [Drizzle ORM](https://orm.drizzle.team/) and [drizzle-zod](https://orm.drizzle.team/docs/zod)
- GitHub OAuth via [Auth.js](https://authjs.dev/)
- Testing with [Vitest](https://vitest.dev/)
- Linting with [@antfu/eslint-config](https://github.com/antfu/eslint-config)

## Setup

Copy the example env file and fill in your values:

```sh
cp .env.example .env
```

Generate and apply database migrations:

```sh
pnpm db:generate
pnpm db:migrate
```

Start the dev server:

```sh
pnpm dev
```

The server runs on [http://localhost:8787](http://localhost:8787) by default.

## Environment Variables

| Variable               | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string                             |
| `PORT`                 | Server port (default: `8787`)                            |
| `AUTH_SECRET`          | Auth.js secret                                           |
| `AUTH_URL`             | Auth.js base URL (e.g. `http://localhost:5173/api/auth`) |
| `GITHUB_CLIENT_ID`     | GitHub OAuth app client ID                               |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret                           |

## Scripts

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Start dev server with hot reload |
| `pnpm build`       | Type-check the project           |
| `pnpm test`        | Run tests with Vitest            |
| `pnpm lint`        | Lint with ESLint                 |
| `pnpm db:generate` | Generate migrations from schema  |
| `pnpm db:migrate`  | Apply pending migrations         |
| `pnpm db:studio`   | Open Drizzle Studio              |

## Code Tour

- [src/app.ts](./src/app.ts) — Hono app export
- [src/index.ts](./src/index.ts) — Node.js entry point (`@hono/node-server`)
- [src/db/](./src/db/) — Drizzle client and schema
- [src/lib/](./src/lib/) — App factory, router, auth config, types
- [src/routes/tasks/](./src/routes/tasks/) — Example route group
  - [tasks.index.ts](./src/routes/tasks/tasks.index.ts) — Router registration
  - [tasks.routes.ts](./src/routes/tasks/tasks.routes.ts) — OpenAPI route definitions
  - [tasks.handlers.ts](./src/routes/tasks/tasks.handlers.ts) — Request handlers
  - [tasks.test.ts](./src/routes/tasks/tasks.test.ts) — Unit tests

## Endpoints

| Path                    | Description              |
| ----------------------- | ------------------------ |
| `GET /api/doc`          | OpenAPI specification    |
| `GET /api/reference`    | Scalar API documentation |
| `GET /api/tasks`        | List all tasks           |
| `POST /api/tasks`       | Create a task            |
| `GET /api/tasks/:id`    | Get one task             |
| `PATCH /api/tasks/:id`  | Update a task            |
| `DELETE /api/tasks/:id` | Delete a task            |
