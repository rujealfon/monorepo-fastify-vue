# Repository Guidelines

## Project structure

This is a pnpm workspace monorepo. The Fastify API lives in `apps/api`, the Vue/Vite client lives in `apps/web`, generated API contracts live in `packages/api-client`, and shared lint configuration lives in `packages/eslint-config`.

API code uses a feature-first layout under `apps/api/src/modules/<domain>/`. Keep a domain's routes, handlers, service, repository, schema, errors, and tests together, and expose cross-domain contracts through its `index.ts`. `apps/api/src/modules/index.ts` is the explicit route registry. Shared API infrastructure belongs in `src/lib`, `plugins`, `db`, `events`, `jobs`, and `test`.

Web code lives under `apps/web/src/features/<feature>/`; each feature exposes routes and cross-feature contracts through `index.ts`. App composition belongs in `src/app`, while code with at least two feature consumers belongs in `src/shared`. Dependency direction is app/features → shared, never shared → features. Server data stays in Pinia Colada queries and mutations; Pinia stores hold client-only state.

Keep constants, utilities, and types beside their owner. Promote helpers only after two real consumers exist. Prefer types inferred from Zod, Drizzle, OpenAPI, and function signatures over duplicate handwritten types.

## Coding conventions

Avoid `process.env` outside the validated configuration layer in `apps/api/src/config`.

Use `#api/modules/<domain>` and `@/features/<feature>` for cross-domain imports. Deep imports are private and rejected by ESLint; `apps/api/src/db/schema/index.ts` is the schema-composition exception.

API handlers own HTTP concerns, services own business rules, repositories own Drizzle queries, and module schemas own database tables and Zod validators.

## Testing

API tests use Vitest and live beside modules in `__tests__`. Name tests by layer, such as `health.routes.test.ts`. Use service tests for business logic, handler tests for HTTP behavior, and repository tests for database integration.

Configure `apps/api/.env.test` with a separate test database before running `pnpm test`. Run `pnpm db:migrate:test` to apply migrations to test database. Do not commit `.env` or `.env.test`; start from the checked-in example files.

Run `pnpm lint`, `pnpm build`, `pnpm test`, and `pnpm api-client:check` before handing off a repository-wide change.

## Database and generated contracts

Module-owned Drizzle tables are composed in `apps/api/src/db/schema/index.ts`. Generate and review migrations with `pnpm db:generate`, and apply them with `pnpm db:migrate` (test database: `pnpm db:migrate:test`). Never use schema push in production.

Regenerate `apps/api/openapi.json` and `packages/api-client/src/schema.d.ts` with `pnpm api-client:generate` after public route or schema changes.

## Commits and pull requests

Use concise, imperative commit messages and keep commits focused. Pull requests should include a short summary, relevant issue links, test results, screenshots for visible UI changes, and explicit notes for migrations or environment changes.
