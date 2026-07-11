# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm workspace monorepo. The API lives in `apps/api`, the Vue/Vite client lives in `apps/web`, and shared packages live in `packages`.

API code uses a feature-first layout under `apps/api/src/modules/<domain>/`. Keep each domain's schema, routes, handlers, service, repository, errors, and tests together, for example `apps/api/src/modules/tasks/tasks.service.ts` and `apps/api/src/modules/tasks/__tests__/tasks.service.test.ts`. Shared API infrastructure is in `apps/api/src/lib`, `middleware`, `db`, `events`, and `jobs`. Web views are in `apps/web/src/views`, reusable Vue components in `apps/web/src/components`, and client helpers in `apps/web/src/lib`.

## Build, Test, and Development Commands

Run commands from the repository root.

- `pnpm install`: install workspace dependencies.
- `pnpm dev`: start API and web dev servers in parallel.
- `pnpm build`: build every workspace package/app.
- `pnpm test`: run all available tests; currently API Vitest tests are included.
- `pnpm lint`: run ESLint across workspaces.
- `pnpm lint:fix`: apply safe ESLint fixes.
- `pnpm db:generate`: generate Drizzle migrations from schema changes.
- `pnpm db:migrate`: apply pending Drizzle migrations.
- `pnpm db:studio`: open Drizzle Studio.

## Coding Style & Naming Conventions

Use TypeScript and ESM. The shared ESLint config in `packages/eslint-config` enforces 2-space indentation, no semicolons, single quotes, sorted imports, kebab-case filenames, and `type` aliases instead of `interface`. Avoid `process.env` outside the validated config layer in `apps/api/src/config`.

Follow existing API layering: handlers handle HTTP concerns, services hold business rules, repositories hold Drizzle queries, and schemas define tables plus Zod validators.

## Testing Guidelines

API tests use Vitest and live beside modules in `__tests__` folders. Name tests by layer, such as `auth.service.test.ts`, `tasks.handlers.test.ts`, or `tasks.repository.test.ts`. Use service tests for business logic, handler tests for HTTP behavior, and repository tests for database integration. Configure `apps/api/.env.test` with a separate test database before running `pnpm test`.

## Commit & Pull Request Guidelines

Recent commits use concise, imperative messages such as `Add Docker support with initial configuration for services` and `Update README files to reflect migration from React to Vue 3`. Keep commits focused and describe the user-facing or architectural change.

For pull requests, include a short summary, linked issue when relevant, test results (`pnpm test`, `pnpm lint`, or targeted commands), and screenshots for visible web UI changes. Note database migrations or environment variable changes explicitly.

## Security & Configuration Tips

Do not commit `.env` or `.env.test`. Start from `apps/api/.env.example` and `apps/api/.env.test.example`, keep dev and test databases separate, and generate strong JWT secrets with `openssl rand -base64 32`.
