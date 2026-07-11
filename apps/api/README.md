# @monorepo-fastify-vue/api

Fastify REST API. See the [root README](../../README.md) for full setup instructions.

## Scripts

Run from this directory, or via `pnpm --filter @monorepo-fastify-vue/api <script>` from the repo root.

| Script | Description |
| --- | --- |
| `pnpm dev` | Start in watch mode (`tsx watch`) |
| `pnpm build` | Compile to `dist/` |
| `pnpm start` | Run the compiled build (`node dist/server.js`) |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm lint` / `pnpm lint:fix` | Lint (and fix) |
| `pnpm test` | Run Vitest against `.env.test`'s database |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio |

Once running, the OpenAPI spec is served at `/openapi.json` and Swagger UI at `/documentation`.

## Project structure

The API is an explicitly composed modular monolith:

```text
src/
├── app.ts                         # Fastify construction and plugin composition
├── server.ts                      # Process entry point only
├── config/index.ts                # Validated runtime configuration
├── db/
│   ├── index.ts                   # Drizzle client
│   ├── migrations/                # Generated migrations
│   └── schema/index.ts            # Drizzle Kit composition barrel
├── plugins/
│   ├── db.ts
│   ├── error-handler.ts
│   ├── security.ts
│   └── sensible.ts
├── modules/
│   ├── index.ts                   # Explicit route registry
│   ├── health/
│   │   ├── index.ts               # Public module API
│   │   ├── health.routes.ts
│   │   └── __tests__/
│   └── tasks/
│       ├── index.ts               # Public module API
│       ├── tasks.routes.ts
│       ├── tasks.handlers.ts
│       ├── tasks.service.ts
│       ├── tasks.repository.ts
│       ├── tasks.schema.ts
│       ├── tasks.errors.ts
│       └── __tests__/
├── events/                        # Shared in-process event infrastructure
├── jobs/                          # Shared job infrastructure
├── lib/                           # Shared technical helpers
└── test/                          # Cross-module test helpers
```

Layer responsibilities:

| Layer | Responsibility |
| --- | --- |
| Routes | Fastify route registration and request/response schemas |
| Handlers | HTTP request, reply, and status-code concerns |
| Services | Business rules and domain errors |
| Repositories | Drizzle queries and persistence |
| Schemas | Module-owned Drizzle tables and Zod validators |

## Module boundaries

Domains live in `src/modules/<domain>` and expose their public API from `index.ts`; `src/modules/index.ts` is the only route registry. Cross-domain callers use `#api/modules/<domain>`, never internal files. Tables and validators remain module-owned, with `src/db/schema/index.ts` as the only deep-import exception for Drizzle Kit. Tests stay beside their module in `__tests__`.

Add a module by keeping its code local, exporting routes from its `index.ts`, adding its public import mapping to `package.json`, and registering it in `src/modules/index.ts`. Keep code local until it has at least two real consumers.

## Environment files

```text
.env.example       # Development template
.env.test.example  # Test template
.env               # Development secrets; ignored
.env.test          # Test secrets; ignored
```

Use separate development and test databases. Configuration is validated in `src/config`; do not read `process.env` elsewhere.

## Vercel

Default deployment uses one Vercel project from the repository root. Do not set this package as the Vercel root directory for the default setup.

Root-level `api/index.ts` forwards Vercel requests to this Fastify app, and `vercel.json` routes `/api/*` through it.

Required environment variables:

- `DATABASE_URL`
- `NODE_ENV=production`

Separate API deployment is possible with Root Directory set to `apps/api`, but it needs its own Vercel function entry and CORS if the web app is hosted on another origin. See the root README before switching to that mode.
