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

In development, Scalar is served at `/` and its OpenAPI document at `/openapi.json`. Documentation routes are not registered in test or production.

## Project structure

The API is an explicitly composed modular monolith:

```text
src/
├── app.ts                         # Fastify construction and plugin composition
├── server.ts                      # Process entry point only
├── config/index.ts                # Validated runtime configuration
├── db/
│   ├── index.ts                   # Drizzle client
│   ├── migrations/                # Generated migrations
│   └── schema/index.ts            # Drizzle Kit composition barrel
├── plugins/
│   ├── db.ts
│   ├── error-handler.ts
│   ├── security.ts
│   └── sensible.ts
├── modules/
│   ├── index.ts                   # Explicit route registry
│   ├── health/
│   │   ├── index.ts               # Public module API
│   │   ├── health.routes.ts
│   │   └── __tests__/
│   └── tasks/
│       ├── index.ts               # Public module API
│       ├── tasks.routes.ts
│       ├── tasks.handlers.ts
│       ├── tasks.service.ts
│       ├── tasks.repository.ts
│       ├── tasks.schema.ts
│       ├── tasks.errors.ts
│       └── __tests__/
├── events/                        # Shared in-process event infrastructure
├── jobs/                          # Shared job infrastructure
├── lib/                           # Shared technical helpers
└── test/                          # Cross-module test helpers
```

Layer responsibilities:

| Layer | Responsibility |
| --- | --- |
| Routes | Fastify route registration and request/response schemas |
| Handlers | HTTP request, reply, and status-code concerns |
| Services | Business rules and domain errors |
| Repositories | Drizzle queries and persistence |
| Schemas | Module-owned Drizzle tables and Zod validators |

## Module boundaries

Domains live in `src/modules/<domain>` and expose their public API from `index.ts`; `src/modules/index.ts` is the only route registry. Cross-domain callers use `#api/modules/<domain>`, never internal files. Tables and validators remain module-owned, with `src/db/schema/index.ts` as the only deep-import exception for Drizzle Kit. Tests stay beside their module in `__tests__`.

Add a module by keeping its code local, exporting routes from its `index.ts`, adding its public import mapping to `package.json`, and registering it in `src/modules/index.ts`. Keep code local until it has at least two real consumers.

## Adding permissions for a feature

Permissions are database rows, so adding a resource does not require changes to the RBAC implementation. For example, to add product permissions:

1. Create a custom migration from the repository root:

   ```sh
   pnpm db:generate --custom --name=seed-products-permissions
   ```

   Add the permission rows to the generated SQL file:

   ```sql
   INSERT INTO "permissions" ("key", "resource", "action", "description")
   VALUES
       ('products.read', 'products', 'read', 'View products'),
       ('products.create', 'products', 'create', 'Create products'),
       ('products.update', 'products', 'update', 'Update products'),
       ('products.delete', 'products', 'delete', 'Delete products')
   ON CONFLICT ("key") DO NOTHING;
   ```

   Permission keys conventionally use `resource.action`; the database requires lowercase dotted segments and allows snake case within each segment. The Super Admin role already has the `*` permission, which covers every new key automatically.

   Prefer assigning the new permissions at `/admin/roles/:id`. The page groups permissions by `resource`, so the `products` group appears automatically. It also prevents privilege escalation: callers can only grant permissions they possess. If a default role must receive a permission at deployment time, add this to the same migration:

   ```sql
   INSERT INTO "role_permissions" ("role_id", "permission_id")
   SELECT roles.id, permissions.id
   FROM roles
   JOIN permissions ON permissions.key IN ('products.read')
   WHERE roles.slug = 'standard-user'
   ON CONFLICT DO NOTHING;
   ```

2. Protect every product API route:

   ```ts
   app.get('/', {
     onRequest: [app.authenticate, app.authorize(['products.read'])]
   }, handlers.list)
   ```

   Use the matching `create`, `update`, or `delete` permission on write routes. Authorization is enforced by the API; web guards only control navigation and presentation.

3. Add web guards where needed:

   ```ts
   meta: { requiresAuth: true, permissions: ['products.read'] }
   ```

   ```vue
   <script setup lang="ts">
   import { Can } from '@/features/permissions'
   </script>

   <template>
     <Can permission="products.create">
       <UButton label="Add product" />
     </Can>
   </template>
   ```

New permission rows do not require API client regeneration because `PermissionKey` is runtime-backed `string`; regenerate the client only when API routes or schemas change.

Direct SQL changes to `role_permissions` do not bump affected users' `authorization_version`. Authorization currently loads from the database per request, but any future versioned authorization cache must either bump those users' versions in the migration or assign permissions through `PUT /api/v1/roles/:roleId/permissions`, which already performs the bump.

## Environment files

```text
.env.example       # Development template
.env.test.example  # Test template
.env               # Development secrets; ignored
.env.test          # Test secrets; ignored
```

Use separate development and test databases. Configuration is validated in `src/config`; do not read `process.env` elsewhere.

## Vercel

Default deployment uses one Vercel project from the repository root. Do not set this package as the Vercel root directory for the default setup.

Root-level `api/index.ts` forwards Vercel requests to this Fastify app, and `vercel.json` routes `/api/*` through it.

Required environment variables:

- `DATABASE_URL`
- `NODE_ENV=production`

Separate API deployment is possible with Root Directory set to `apps/api`, but it needs its own Vercel function entry and CORS if the web app is hosted on another origin. See the root README before switching to that mode.
