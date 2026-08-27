# Features

Each feature exposes its routes and other cross-feature contracts from `index.ts`. Keep views, components, composables, queries, mutations, and client-only stores feature-local; create those folders only when needed. Server data belongs in Pinia Colada, not Pinia stores.

Keep constants, utilities, and types with their owning feature. Prefer inferred and API-client types; promote code to `shared` only after two features use it.
