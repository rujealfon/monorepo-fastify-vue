# API Client

Typed Fetch client generated from the Fastify OpenAPI document.

## Regenerate

After changing API routes or schemas, run from the repository root:

```sh
pnpm api-client:generate
```

This regenerates `apps/api/openapi.json` and `src/schema.d.ts`. Do not edit either generated file by hand.

## Module types

Keep one generated `schema.d.ts` for the complete API. Each API module may expose short aliases derived from its generated `paths` entries:

```ts
// src/tasks/types.ts
import type { paths } from "../schema.js";

type TasksPath = paths["/api/v1/tasks/"];

export type TaskList = TasksPath["get"]["responses"][200]["content"]["application/json"];
export type CreateTask = TasksPath["post"]["requestBody"]["content"]["application/json"];
```

Export public aliases from `src/index.ts`, then consume them from the package root:

```ts
import type { CreateTask, HealthResponse, Task } from "@monorepo-fastify-vue/api-client";
```

When adding an API module:

1. Regenerate the OpenAPI client.
2. Add `src/<module>/types.ts` only when shorter public names are useful.
3. Derive every alias from `paths`; never duplicate object fields manually.
4. Export the aliases from `src/index.ts`.

Skip aliases for headers, `never`, and unused empty responses.
