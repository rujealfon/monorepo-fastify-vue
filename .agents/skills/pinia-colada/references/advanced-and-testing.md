# Advanced Patterns and Testing

Read this reference for pagination, infinite loading, prefetching, persistence,
plugins, migration, and test strategy.

## Contents

- [Paginated Versus Infinite Queries](#paginated-versus-infinite-queries)
- [Prefetching](#prefetching)
- [Official Plugins](#official-plugins)
- [Cache Persistence](#cache-persistence)
- [Testing](#testing)
- [TanStack and Nuxt Migration](#tanstack-and-nuxt-migration)

## Paginated Versus Infinite Queries

Use regular `useQuery()` when each numbered page should be an independent cache
entry:

```ts
useQuery(() => ({
  ...contactPageQuery(Number(route.query.page) || 1),
  placeholderData: (previousData) => previousData,
}))
```

Include the page in the key. `placeholderData` can preserve the previous page
while the new entry loads; it reports a successful placeholder state without
writing that placeholder to the cache or SSR payload.

Use `useInfiniteQuery()` when loaded pages should merge into one entry:

```ts
const feed = useInfiniteQuery({
  key: () => feedKeys.list({ search: search.value }),
  initialPageParam: null as string | null,
  query: ({ pageParam }) => listFeed({
    search: search.value,
    cursor: pageParam,
  }),
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
  maxPages: 10,
})
```

Put stable filters in the key. Do not put `pageParam` in the key. Data contains
`pages` and `pageParams`; invalidation and refetch affect the whole entry.
Return `null` or `undefined` from the next/previous page-param getter to stop
loading. Define `getPreviousPageParam()` before calling `loadPreviousPage()`.

## Prefetching

Attach options before refreshing:

```ts
const queryCache = useQueryCache()
const options = productDetailQuery(productId)
await queryCache.refresh(queryCache.ensure(options))
```

Later consumers reuse cached data or the in-flight request. Prefer
`defineQueryOptions()` so prefetches share typed identity with components.

`setQueryData()` can seed data directly, but a bare seeded entry has no query
function or freshness behavior. Call `ensure(options)` first when it must
remain a fully functional query.

## Official Plugins

Install only required behavior:

| Package/export | Purpose | Important constraint |
| --- | --- | --- |
| `@pinia/colada-plugin-auto-refetch` | Interval or stale-time refetching | Client-only timers; `true` needs `staleTime` |
| `@pinia/colada-plugin-retry` | Retry failed queries | Stops when inactive or disabled |
| `@pinia/colada-plugin-delay` | Delay `asyncStatus: 'loading'` | Reduces refresh flicker |
| `PiniaColadaQueryHooksPlugin` | Global query success/error/settled hooks | Built into core; use typed `meta` |
| `@pinia/colada-plugin-cache-persister` | Persist successful query data | Filter sensitive data and handle serialization |

Register plugins through `PiniaColada` options or Nuxt's
`colada.options.ts`. Confirm package-specific option names against installed
types.

## Cache Persistence

Persistence is a best-effort cache, not a source of truth.

- Increase `gcTime` when entries must survive long enough to remain persisted.
- Filter out user-private or sensitive key families.
- Use `devalue` or a custom codec for `Date`, `Map`, `Set`, or domain classes.
- Await `isCacheReady()` before mounting when storage is asynchronous.
- Expect serialization and storage failures to fall back to stale or empty
  cache rather than crash the app.

## Testing

Mount with real stores:

```ts
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { mount } from '@vue/test-utils'

function mountWithColada(component: Component) {
  return mount(component, {
    global: {
      plugins: [createPinia(), PiniaColada],
    },
  })
}
```

Never use `createTestingPinia()`; it stubs Pinia actions used internally by
Colada.

Prefer MSW or the project's network mock layer so the real query/mutation/cache
flow runs. After mount or user actions:

1. Assert the pending/loading state when meaningful.
2. Flush promises.
3. Assert success or error UI.
4. Assert invalidated data, rollback, deduplication, or cache state when that is
   the feature under test.

Use direct mocked query functions only for narrow unit tests.

For SSR tests, verify no duplicate client request after hydration and no cache
leakage between simulated requests.

## TanStack and Nuxt Migration

Treat migration as semantic translation:

- Map query keys to Colada hierarchical factories.
- Map status values and option names explicitly.
- Decide whether compatibility helpers are temporary or intentional.
- Replace component-specific mutation callbacks with Colada mutation hooks or
  local caller handling as appropriate.
- Re-evaluate defaults such as stale time, garbage collection, structural
  sharing, retries, and refetch controls.
- Run official codemods only for their documented version transitions, inspect
  their diff, then typecheck and test.

The optional `@pinia/colada-plugin-tanstack-compat` eases incremental migration,
but it does not reproduce every TanStack property or behavior. Do not claim
full compatibility.

## Source Pages

- https://pinia-colada.esm.dev/guide/paginated-queries.md
- https://pinia-colada.esm.dev/guide/infinite-queries.md
- https://pinia-colada.esm.dev/cookbook/prefetching.md
- https://pinia-colada.esm.dev/cookbook/cache-persistence.md
- https://pinia-colada.esm.dev/cookbook/testing.md
- https://pinia-colada.esm.dev/plugins/official/
- https://pinia-colada.esm.dev/cookbook/migration-tvq.md
