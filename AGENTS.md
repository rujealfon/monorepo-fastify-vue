# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm workspace monorepo. The API lives in `apps/api`, the Vue/Vite client lives in `apps/web`, and shared packages live in `packages`.

API code uses a feature-first layout under `apps/api/src/modules/<domain>/`. Keep each domain's schema, routes, handlers, service, repository, errors, and tests together, and expose cross-domain contracts through the module's `index.ts`. `modules/index.ts` is the explicit route registry. Shared API infrastructure is in `apps/api/src/lib`, `plugins`, `db`, `events`, `jobs`, and `test`.

Web code lives under `apps/web/src/features/<feature>/`; each feature exposes routes and cross-feature contracts through `index.ts`. App composition belongs in `src/app`, while code with at least two feature consumers belongs in `src/shared`. Dependency direction is app/features → shared, never shared → features. Server data stays in Pinia Colada queries and mutations; Pinia stores hold client-only state.

Keep constants, utilities, and types beside their owning module or feature, using names such as `tasks.constants.ts`, `tasks.utils.ts`, or `tasks.types.ts`. Do not create global `constants`, `utils`, or `types` folders preemptively. Promote code only after it has at least two real consumers: API technical helpers go to `apps/api/src/lib`, web helpers go to `apps/web/src/shared`, and API contract types go to `packages/api-client`. Prefer types inferred from Zod, Drizzle, OpenAPI, and function signatures over duplicate handwritten types. When a field already has a type in `packages/api-client` (e.g. an enum from the OpenAPI schema), web code must reference that type instead of a hand-rolled duplicate — even for runtime value lists (dropdown options, etc.) where no runtime array is exported, type the list against the schema-derived union so an API schema change breaks the web typecheck instead of drifting silently.

## Coding Style & Naming Conventions

Avoid `process.env` outside the validated config layer in `apps/api/src/config`.

Follow existing API layering: handlers handle HTTP concerns, services hold business rules, repositories hold Drizzle queries, and schemas define tables plus Zod validators.

Use `#api/modules/<domain>` and `@/features/<feature>` for cross-domain imports. Deep imports are private and rejected by ESLint; `apps/api/src/db/schema/index.ts` is the sole exception for composing module-owned Drizzle tables.

## Audit Logging

Every new mutation (create, update, delete, replace, assign) and security event must record an audit event via `recordAuditEvent` from `#api/modules/audit-logs`, called from the service layer. Add the action to `AUDIT_ACTIONS` in `audit-logs.schema.ts` (naming: `<entity>.<past_tense_verb>`), keep the audit write atomic with transactional mutations via the repository's optional audit callback, follow the metadata conventions (before/after diffs, never secrets or raw PII), and add the action label to the web audit page. Full recipe: `apps/api/src/modules/audit-logs/README.md`.

## Testing Guidelines

API tests use Vitest and live beside modules in `__tests__` folders. Name tests by layer, such as `auth.service.test.ts`, `tasks.handlers.test.ts`, or `tasks.repository.test.ts`. Use service tests for business logic, handler tests for HTTP behavior, and repository tests for database integration. Configure `apps/api/.env.test` with a separate test database before running `pnpm test`.

## Commit & Pull Request Guidelines

Recent commits use concise, imperative messages such as `Add Docker support with initial configuration for services` and `Update README files to reflect migration from React to Vue 3`. Keep commits focused and describe the user-facing or architectural change.

For pull requests, include a short summary, linked issue when relevant, test results (`pnpm test`, `pnpm lint`, or targeted commands), and screenshots for visible web UI changes. Note database migrations or environment variable changes explicitly.

## Security & Configuration Tips

Do not commit `.env` or `.env.test`. Start from `apps/api/.env.example` and `apps/api/.env.test.example`, keep dev and test databases separate, and generate strong JWT secrets with `openssl rand -base64 32`.
