# API modules

Each domain owns its applicable routes or framework adapters, handlers, service,
repository, schema, errors, and tests. Export its public API from `index.ts`;
register route-bearing modules in this folder's `index.ts`. The Sessions domain,
for example, exposes a Fastify adapter rather than routes of its own.

Keep domain constants, utilities, and types in their module. Prefer inferred types; move technical helpers to `src/lib` only after two modules use them.
