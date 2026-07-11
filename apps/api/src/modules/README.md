# API modules

Each domain owns its routes, handlers, service, repository, schema, errors, and tests. Export its public API from `index.ts`; register routes in this folder's `index.ts`.

Keep domain constants, utilities, and types in their module. Prefer inferred types; move technical helpers to `src/lib` only after two modules use them.
