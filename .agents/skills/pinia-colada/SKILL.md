---
name: pinia-colada
description: Build, migrate, debug, review, and test typed server-state flows in Vue 3 and Nuxt with Pinia Colada. Use for @pinia/colada setup, useQuery, useInfiniteQuery, useMutation, query-key factories, defineQueryOptions, cache invalidation, optimistic updates, prefetching, SSR/hydration, persistence, plugins, testing, or migrations from Nuxt data composables and TanStack Vue Query.
---

# Pinia Colada

Implement Pinia Colada as the server-state layer while preserving the host
project's Vue, Nuxt, TypeScript, API-client, and testing conventions.

## Start With the Repository

1. Inspect `package.json`, the lockfile, Nuxt/Vite configuration, Pinia setup,
   API clients, existing query modules, and tests.
2. Determine the installed versions of `@pinia/colada`,
   `@pinia/colada-nuxt`, and any Colada plugins.
3. Prefer installed package types and local source over this skill when a
   version-specific API differs. Consult the current official documentation
   before adding an option or export that is absent locally.
4. Change only the server-state behavior in scope. Preserve established
   request, error, auth, and serialization boundaries.

## Choose the Primitive

- Use `useQuery()` for declarative reads that should be cached, deduplicated,
  shared, invalidated, or rendered during SSR.
- Use `useMutation()` for writes and other user-triggered side effects.
- Use page-in-key `useQuery()` for independently cached numbered pages.
- Use `useInfiniteQuery()` for load-more or infinite-scroll data whose loaded
  pages should form one cache entry.
- Use `defineQueryOptions()` to organize and type reusable query options.
- Use `defineQuery()` only when the query must share additional reactive state
  or expose a shared composed interface.
- Keep Nuxt `useFetch()` or `useAsyncData()` for genuinely simple, page-local,
  one-off data when Colada's shared cache and mutation features add no value.

Read [queries-and-keys.md](references/queries-and-keys.md) before implementing
queries, query organization, reusable queries, or key changes.

## Model Keys Before Fetching

1. Create a domain key factory with hierarchical keys and `as const`.
2. Include every variable that affects the query result in the key.
3. Use a getter when a key depends on reactive values.
4. Define options with `defineQueryOptions()` so keys carry the query data type.
5. Reuse the same factory and defined options for cache reads, writes,
   invalidation, prefetching, and tests.

| Option            | Meaning                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`             | Cache identity. Array of serializable values. Use a getter `() => [...]` (or computed/ref) whenever it depends on reactive state — plain arrays don't react.                     |
| `query`           | Promise-returning function receiving `{ signal, entry }`. Read reactive params from the closure, mirror them in `key`, and pass `signal` to cancellable requests when supported. |
| `enabled`         | Boolean or getter; pause query until true (e.g. `() => !!route.params.id`).                                                                                                      |
| `staleTime`       | How long cached data counts as fresh (no auto refetch).                                                                                                                          |
| `gcTime`          | How long unused entries stay in cache.                                                                                                                                           |
| `placeholderData` | Shown while pending; `(prev) => prev` keeps previous page during pagination.                                                                                                     |

## Implement the State Lifecycle

- `status` (data state): `'pending' | 'success' | 'error'`. `state.value` is the discriminated union: checking `state.value.status === 'error'` narrows `state.value.error`. Separate `status` and `error` refs do not cross-narrow.
- `asyncStatus` (fetch state): `'idle' | 'loading'`. `loading` is true on refetches even when stale data is displayed.

## Keep Writes and Cache Consistent

1. Pass mutation inputs as the `mutation` argument so hooks and `variables`
   receive them.
2. Invalidate affected key families after writes, usually in `onSettled`.
3. Await or return invalidation only when the mutation must remain loading until
   active queries finish refreshing.
4. Use optimistic updates only when the UX benefit justifies rollback logic:
   cancel competing requests, snapshot data, write immutably, return context,
   conditionally roll back on error, and invalidate on settlement.
5. Use a mutation key when another component must discover its state through
   the mutation cache.

Read [mutations-and-cache.md](references/mutations-and-cache.md) before changing
mutations, invalidation, optimistic updates, or direct cache operations.

## Integrate With Nuxt and SSR

- Install `@pinia/colada-nuxt` alongside the Pinia Nuxt module.
- When introducing Pinia Colada, install `@pinia/colada-devtools` as a
  development dependency and place `PiniaColadaDevtools` at the end of the root
  component template. Do not enable production devtools unless requested.
- Put module options in root-level `colada.options.ts`.
- Do not add `await` merely to make `useQuery()` SSR-compatible; the Nuxt module
  registers server prefetching and hydrates the cache automatically.
- Add `await refresh()` only when navigation should block on the client.
- Keep keys and serialized metadata deterministic and serializable across
  server and client.
- Import `useRoute` from `vue-router` inside Nuxt `defineQuery()` definitions.
- Store extra SSR-dependent `defineQuery()` state in Nuxt `useState()` or a
  serializable Pinia store.

Read [nuxt-and-ssr.md](references/nuxt-and-ssr.md) for installation, migration,
custom SSR, and hydration details.

```ts
const contactByIdQuery = defineQueryOptions((id: string) => ({
  key: CONTACT_KEYS.byId(id),
  query: () => getContact(id),
}));
// in component:
const query = useQuery(() => contactByIdQuery(route.params.id as string));
```

1. Run the project's typecheck, lint, and focused tests.
2. Exercise pending, success, error, refresh, and mutation states relevant to
   the change.
3. Test cache effects by behavior: deduplication, invalidation scope, rollback,
   pagination transitions, or hydration.
4. Mount with a real `createPinia()` and `PiniaColada`; never use
   `createTestingPinia()` because stubbed actions break Colada internals.
5. Prefer network-layer mocking such as MSW and flush pending Vue promises.

Read [advanced-and-testing.md](references/advanced-and-testing.md) for
pagination, infinite queries, prefetching, persistence, plugins, migration, and
test patterns.

- `mutate(vars)` — fire-and-forget, errors caught into `state.error`, never throws.
- `mutateAsync(vars)` — returns promise, rethrows; wrap in try/catch.
- Hooks: `onMutate(vars, ctx)` → `onSuccess(data, vars, ctx)` / `onError(err, vars, ctx)` → `onSettled(data, err, vars, ctx)`. Properties returned from `onMutate` are merged into the runtime context, which also includes the mutation entry.
- Returning a promise from a hook (e.g. awaiting `invalidateQueries`) keeps `asyncStatus` at `loading` until refetch completes.
- Global mutation hooks via `mutationOptions` at plugin install (e.g. global error toast).

- Do not create a long-lived query inside a Pinia store by default. Stores are
  never disposed, so the query can become immortal; consume the query cache or
  use defined options instead.
- Do not omit a reactive input from a key.
- Do not put the infinite-query page or cursor parameter in its key; include
  filters, not `pageParam`.
- Do not mutate cached arrays or objects in place.
- Do not clear entries without canceling pending requests first.
- Do not persist sensitive queries by default.
- Do not place functions or non-serializable values in SSR metadata unless they
  are omitted on the server or use an explicit serializer.

## Official Sources

This skill was derived from the Pinia Colada documentation at repository commit
`5c9363d64fab2c12481701e66d4491a6b3b18f21` (2026-07-22).

## Reuse: which tool

| Situation                                                                        | Use                                                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| One component needs the query                                                    | `useQuery` inline (or in a plain composable)                                          |
| Reuse key+query definition, state stays per-component                            | `defineQueryOptions`                                                                  |
| Multiple mounted components must share state (e.g. a search ref driving the key) | `defineQuery(() => { ...useQuery()... })` — setup runs once globally, refs are shared |

```ts
export const useFilteredContacts = defineQuery(() => {
  const search = ref('');
  const query = useQuery({
    key: () => ['contacts', { search: search.value }],
    query: () => searchContacts(search.value),
  });
  return { ...query, search };
});
```

## Pagination

```ts
const { state, asyncStatus } = useQuery({
  key: () => ['contacts', { page: Number(route.query.page) || 1 }],
  query: () => listContacts(Number(route.query.page) || 1),
  placeholderData: (prev) => prev, // keep previous page visible while next loads
});
```

With `placeholderData`, `status` stays `'success'` but `asyncStatus` is `'loading'` — use `asyncStatus` for the spinner. For "load more" that merges pages into one list, use `useInfiniteQuery()` instead.

## Error handling essentials

- Only thrown/rejected values become errors. `fetch` doesn't throw on 4xx/5xx — check `response.ok` and throw a typed error in the query function.
- On refetch failure, previous `data` is kept — show stale data + error notice, don't blank the UI.
- Per-query error messages: put `meta: { errorMessage: '...' }` on the query and read it in a global `PiniaColadaQueryHooksPlugin` `onError`.
- Type errors globally: `declare module '@pinia/colada' { interface TypesConfig { defaultError: ApiError } }`.

Details and global-handler setup: [references/error-handling.md](references/error-handling.md).

## Optimistic updates

Full pattern (setQueryData in `onMutate`, cancelQueries, identity-checked rollback in `onError`, invalidate in `onSettled`): [references/optimistic-updates.md](references/optimistic-updates.md). Read it before writing any optimistic-update code — naive versions lose concurrent updates.

## Review checklist

When reviewing Pinia Colada code, flag:

- Reactive value used in `query` but missing from `key` (stale-cache bug).
- Plain-array `key` that should be a getter (loses reactivity).
- Mutation that changes cached server data without invalidation or an optimistic update — affected UI won't refresh.
- `mutateAsync` without handling rejection at the caller boundary or deliberately propagating it.
- Manual `ref`/`onMounted` fetch code that should be a `useQuery`.
- `useQueryCache()` called at module top level (must be inside setup/store/guard).
