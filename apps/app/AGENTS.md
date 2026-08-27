# App Guidelines

App code lives under `apps/app/src/features/<feature>/`; each feature exposes routes and cross-feature contracts through `index.ts`. App composition belongs in `src/app`, while code with at least two feature consumers belongs in `src/shared`. Dependency direction is app/features → shared, never shared → features. Server data stays in Pinia Colada queries and mutations; Pinia stores hold client-only state.

Use `@/features/<feature>` for cross-feature imports. Deep imports are private and rejected by ESLint.
