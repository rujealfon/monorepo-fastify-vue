# API Guidelines

API code uses a feature-first layout under `apps/api/src/modules/<domain>/`. Keep each domain's schema, routes, handlers, service, repository, errors, and tests together, and expose cross-domain contracts through the module's `index.ts`. `modules/index.ts` is the explicit route registry. Shared API infrastructure is in `apps/api/src/lib`, `plugins`, `db`, `events`, `jobs`, and `test`.

## Coding Style & Naming Conventions

Avoid `process.env` outside the validated config layer in `apps/api/src/config`.

Follow existing API layering: handlers handle HTTP concerns, services hold business rules, repositories hold Drizzle queries, and schemas define tables plus Zod validators. Dependency direction is route → handler → service → repository; ESLint rejects reverse or skip-level imports (e.g. a handler importing a repository, or a service importing a route) within `apps/api/src/modules/<domain>/`.

Use `#api/modules/<domain>` for cross-domain imports. Deep imports are private and rejected by ESLint; `apps/api/src/db/schema/index.ts` is the sole exception for composing module-owned Drizzle tables.

Generate and review migrations from schema changes with `pnpm db:generate`, and apply them with `pnpm db:migrate` (Docker: `pnpm docker:db:migrate`). Never use schema push in production.

## Testing Guidelines

API tests use Vitest and live beside modules in `__tests__` folders. Name tests by layer, such as `users.service.test.ts`, `users.handlers.test.ts`, or `users.repository.test.ts`. Use service tests for business logic, handler tests for HTTP behavior, and repository tests for database integration. Configure `apps/api/.env.test` with a separate test database before running `pnpm test`. When developing locally with Docker, apply migrations to that database with `pnpm docker:db:migrate:test`; use `pnpm db:migrate:test` only when the test database is reachable directly from the host.
