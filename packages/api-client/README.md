# API Client

Typed Fetch client generated from the Fastify OpenAPI document.

`createSessionClient` and `createHealthClient` add framework-neutral domain
semantics on top of the generated transport. Frontends keep framework state
adapters local while sharing status and error handling here.

The internal request executor owns transport failures, HTTP failures,
missing-data checks, and empty-success responses. Domain clients return data or
throw a normalized `RpcError`, so consumers never branch on raw
`data`/`error`/`response` triples.

## Regenerate

After changing API routes or schemas, run from the repository root:

```sh
pnpm api-client:generate
```

This regenerates `apps/api/openapi.json` and `src/schema.d.ts`. Do not edit either generated file by hand.

CI runs `pnpm api-client:check`, regenerates both files, and fails if the committed contract is stale.

## Module types

Keep one generated `schema.d.ts` for the complete API. Each API module may expose short aliases derived from its generated `paths` entries:

```ts
// src/users/types.ts
import type { paths } from "../schema.js";

type ProfilePath = paths["/api/v1/profile/"];

export type User = ProfilePath["get"]["responses"][200]["content"]["application/json"];
export type UpdateProfile = ProfilePath["patch"]["requestBody"]["content"]["application/json"];
```

Export public aliases from `src/index.ts`, then consume them from the package root:

```ts
import type { HealthResponse, UpdateProfile, User } from "@monorepo-fastify-vue/api-client";
```

When adding an API module:

1. Regenerate the OpenAPI client.
2. Add `src/<module>/types.ts` only when shorter public names are useful.
3. Derive every alias from `paths`; never duplicate object fields manually.
4. Export the aliases from `src/index.ts`.

Skip aliases for headers, `never`, and unused empty responses.
