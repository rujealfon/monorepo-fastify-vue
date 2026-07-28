# Nuxt and SSR

Read this reference for Nuxt setup, native-composable migration, server
prefetching, hydration, and custom SSR.

## Choose Nuxt Native or Colada

Keep `useFetch()` or `useAsyncData()` for simple page-local, one-off data.
Choose Pinia Colada when data is shared across components or pages, mutations
must keep reads consistent, optimistic updates matter, or the app benefits from
deduplication, stale-while-revalidate, garbage collection, or persistence.

Do not migrate mechanically when the native composable is already the clearer
boundary.

## Install the Nuxt Module

Install Pinia, Pinia Colada, and their Nuxt modules. Configure modules in
`nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
  ],
})
```

The exact Pinia module name may already be established by the project. Preserve
the local convention and installed versions.

Install `@pinia/colada-devtools` as a development dependency. Add
`PiniaColadaDevtools` at the end of the root `app.vue` or `app/app.vue`
template, separated from existing content by a blank line. Its regular
component is stripped from production; do not switch to
`PiniaColadaProdDevtools` unless production access is explicitly requested.

Put Colada plugin options at the project root:

```ts
// colada.options.ts
import type { PiniaColadaOptions } from '@pinia/colada'

export default {
  queryOptions: {
    staleTime: 30_000,
  },
  plugins: [],
} satisfies PiniaColadaOptions
```

## SSR Lifecycle

The Nuxt module:

1. Registers each active query with `onServerPrefetch`.
2. Waits for queries during server rendering.
3. Serializes the cache into the Nuxt payload.
4. Hydrates it on the client.
5. Disables server garbage-collection timers and clears per-request cache data.

Do not write:

```ts
const result = await useQuery(options)
```

Call `useQuery(options)` normally. If client navigation must wait for data,
explicitly await the returned `refresh()`:

```ts
const { data, refresh } = useQuery(productListQuery)
await refresh()
```

Without that await, render the pending state and let data populate.

## Migrate Native Composables

Translate native keys and handlers deliberately:

```ts
const { data, pending, error, refresh } =
  await useFetch('/api/products')
```

becomes:

```ts
const { data, isPending, error, refresh } = useQuery({
  key: productKeys.list({}),
  query: () => $fetch('/api/products'),
})
```

Then move the key and options into a key factory plus
`defineQueryOptions()` when used in production code.

Map `pending` to `isPending`, add complete cache identity, remove the await, and
select `staleTime` based on product semantics rather than copying defaults
blindly.

## Nuxt `defineQuery()` Caveats

Explicitly import `useRoute` from `vue-router` inside a query definition:

```ts
import { useRoute } from 'vue-router'

export const useCurrentProduct = defineQuery(() => {
  const route = useRoute()
  return useQuery(() =>
    productDetailQuery(route.params.productId as string),
  )
})
```

Nuxt's auto-imported route wrapper interacts with Suspense and can trigger
extra or undefined-key fetches in this context.

Only Colada query state is serialized automatically. Extra refs returned by
`defineQuery()` are not. Put SSR-dependent shared state in `useState()` or a
serializable Pinia store:

```ts
export const useProductSearch = defineQuery(() => {
  const search = useState('product-search', () => '')
  return {
    search,
    ...useQuery(() => productSearchQuery(search.value)),
  }
})
```

Ensure the initial server and client values match.

## Client-Only and Errors

Disable a query on the server when it depends on browser-only state:

```ts
useQuery({
  ...browserOnlyQuery,
  enabled: import.meta.client,
})
```

Standard `Error` values work with Nuxt payload handling. Register a Nuxt payload
reducer and reviver for custom error classes. Keep query `meta` serializable;
omit callbacks and other non-serializable values during SSR.

## Custom SSR Without Nuxt

Follow Pinia's SSR setup, then serialize and hydrate Colada's cache tree with:

- `isQueryCache`
- `serializeQueryCache`
- `hydrateQueryCache`

Install Pinia and `PiniaColada` before hydrating.

On the server, add `PiniaColadaSSRNoGc()` and clear the request cache after
rendering:

```ts
app.use(PiniaColada, {
  plugins: import.meta.env.SSR ? [PiniaColadaSSRNoGc()] : [],
})

// After rendering this request:
useQueryCache(pinia).caches.clear()
```

This prevents `gcTime` timers from keeping build processes alive and retaining
entries across requests. The Nuxt module already performs this work.

## Source Pages

- https://pinia-colada.esm.dev/nuxt.md
- https://pinia-colada.esm.dev/guide/ssr.md
- https://pinia-colada.esm.dev/advanced/reusable-queries.md
