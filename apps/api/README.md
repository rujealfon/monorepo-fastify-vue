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

## Vercel

The deployed app uses one Vercel project from the repository root. Do not set this package as the Vercel root directory.

Root-level `api/index.ts` forwards Vercel requests to this Fastify app, and `vercel.json` routes `/api/*` through it.

Required environment variables:

- `DATABASE_URL`
- `NODE_ENV=production`
