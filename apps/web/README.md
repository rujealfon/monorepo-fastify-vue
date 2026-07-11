# Web App

Vue 3 + Vite frontend for the monorepo.

## Development

Run from the repo root:

```sh
pnpm dev
```

The Vite dev server proxies `/api` to `http://localhost:3000`.

## Project Structure

Feature-based layout under `src/`. Data fetching uses [Pinia Colada](https://pinia-colada.esm.dev/) (`useQuery` / `useMutation`) on top of Pinia:

```
src/
├── app/                        # App-level setup & config
│   ├── layouts/                # App shells (DefaultLayout.vue)
│   ├── router/                 # Root router; imports feature public entries
│   └── plugins/                # Vue plugin registration (Pinia and Pinia Colada)
│       ├── index.ts            # registerPlugins(app) — installs Pinia + PiniaColada
│       └── pinia-colada.ts     # Global PiniaColada query/mutation defaults
│
├── assets/
│   ├── styles/                 # Global CSS (main.css, base.css)
│   └── images/                 # Static images (logo.svg, …)
│
├── features/                   # ⭐ One folder per domain feature
│   └── <feature>/              # e.g. health/ or tasks/
│       ├── index.ts            # Public feature API
│       ├── routes.ts           # Exports RouteRecordRaw[]
│       ├── views/              # Route-level pages (lazy-loaded from routes.ts)
│       ├── components/         # Optional feature-private UI
│       ├── composables/        # Optional UI-facing feature behavior
│       ├── queries.ts          # Optional reads and query keys
│       ├── mutations.ts        # Optional writes and cache invalidation
│       └── stores/             # Optional client-only Pinia state
│
├── shared/                     # Cross-feature code (no feature imports here)
│   ├── api/
│   │   └── client.ts           # api-client singleton
│   ├── components/             # Reusable UI components
│   ├── composables/            # Reusable composables (useDebounce, useToast, …)
│   └── utils/                  # Pure helpers (formatters, guards)
│
├── App.vue
└── main.ts
```

Per-feature data layer:

- `queries.ts` — the only place query keys are written. Export a key factory and `defineQueryOptions` bundles:

  ```ts
  export const HEALTH_KEYS = {
    root: ['health'] as const,
    live: () => [...HEALTH_KEYS.root, 'live'] as const
  }

  export const healthLiveQuery = defineQueryOptions({
    key: HEALTH_KEYS.live(),
    query: async () => {
      const { data, response } = await api.GET('/api/v1/health/live')
      if (!response.ok)
        throw new RpcError(response.status)

      return data
    }
  })
  ```

- `mutations.ts` — `useMutation` wrappers that invalidate the feature's keys after successful writes via `useQueryCache()`.
- `composables/` — what components actually import; compose queries/mutations with UI state. Use `defineQuery` here when several mounted components must share the same reactive state (e.g. a shared search ref).
- `stores/` — Pinia stores only for client-side state (UI prefs, wizard state, session). Server data belongs in the Colada query cache, not stores.

Rules:

- A feature may import another feature only through `@/features/<feature>`; deep imports are private. Shared code cannot import features. ESLint enforces both directions.
- Parent-relative (`../`) imports are ESLint errors everywhere in `src/` — use the `@/` alias to reach outside the current directory.
- Components never call `api` directly — API calls live in feature queries/mutations, consumed through composables.
- Every reactive value used inside a `query` function must appear in its `key` (use a getter key: `key: () => [...]`).
- API types come from `@monorepo-fastify-vue/api-client`; do not hand-write them.
