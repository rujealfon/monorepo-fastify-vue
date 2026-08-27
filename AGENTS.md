# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm workspace monorepo. The API lives in `apps/api`, the Vue/Vite application lives in `apps/app` (UI components from `@nuxt/ui`, not the Nuxt framework; composition utilities from `@vueuse/core`), the separate Nuxt site lives in `apps/web`, and shared packages live in `packages`. See `apps/api/CLAUDE.md`, `apps/app/CLAUDE.md`, and `apps/web/CLAUDE.md` for layout and coding conventions specific to each app.

Keep constants, utilities, and types beside their owning module or feature, using names such as `users.constants.ts`, `users.utils.ts`, or `users.types.ts`. Do not create global `constants`, `utils`, or `types` folders preemptively. Promote code only after it has at least two real consumers: API technical helpers go to `apps/api/src/lib`, app helpers go to `apps/app/src/shared`, and API contract types go to `packages/api-client`. Prefer types inferred from Zod, Drizzle, OpenAPI, and function signatures over duplicate handwritten types. When a field already has a type in `packages/api-client` (e.g. an enum from the OpenAPI schema), app code must reference that type instead of a hand-rolled duplicate — even for runtime value lists (dropdown options, etc.) where no runtime array is exported, type the list against the schema-derived union so an API schema change breaks the app typecheck instead of drifting silently.

## Commit & Pull Request Guidelines

Recent commits use concise, imperative messages such as `Add Docker support with initial configuration for services` and `Update README files to reflect migration from React to Vue 3`. Keep commits focused and describe the user-facing or architectural change.

For pull requests, include a short summary, linked issue when relevant, test results (`pnpm test`, `pnpm lint`, or targeted commands), and screenshots for visible UI changes. Note database migrations or environment variable changes explicitly.

## Security & Configuration Tips

Do not commit `.env` or `.env.test`. Start from `apps/api/.env.example` and `apps/api/.env.test.example`, keep dev and test databases separate, and generate strong JWT secrets with `openssl rand -base64 32`.
