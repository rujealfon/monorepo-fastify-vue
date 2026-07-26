# Queries and Keys

Read this reference for query implementation, key design, query reuse, and
state rendering.

## Core State Model

`useQuery()` requires a `key` and a promise-returning `query`:

```ts
const result = useQuery({
  key: ['todos'],
  query: getTodos,
})
```

Use these distinctions:

| Value | Meaning |
| --- | --- |
| `state.status` / `status` | Data state: `pending`, `success`, or `error` |
| `asyncStatus` | Request state: `idle` or `loading` |
| `isPending` | No successful data has resolved yet |
| `isLoading` | A request is currently running |
| `refresh()` | Deduplicate and respect freshness |
| `refetch()` | Force a new fetch, ignoring freshness |

Prefer `state.status` branches when TypeScript must narrow `state.data` or
`state.error`.

Both `refresh()` and `refetch()` catch errors by default and return the state.
Pass `true` (for example, `await refetch(true)`) only when the caller intends to
catch a thrown error.

## Key Invariants

- Use JSON-serializable key values.
- Treat numbers and strings as distinct: `['doc', 2] !== ['doc', '2']`.
- Treat object property order as irrelevant.
- Treat array order as significant.
- Remember that `undefined` object properties are removed while `null` is
  retained.
- Include every route param, prop, filter, locale, tenant, auth scope, and
  other variable that changes returned data.
- Wrap reactive keys in a getter.
- Arrange broad-to-specific segments so prefix filters express useful
  invalidation groups.

## Key Factory and Typed Options

Use one domain module for keys and query definitions:

```ts
import { defineQueryOptions } from '@pinia/colada'
import { getDocument, getDocuments } from '@/api/documents'

export const documentKeys = {
  root: ['documents'] as const,
  lists: () => [...documentKeys.root, 'list'] as const,
  list: (filters: { ownerId?: string }) =>
    [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.root, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
}

export const documentListQuery = defineQueryOptions(
  (filters: { ownerId?: string }) => ({
    key: documentKeys.list(filters),
    query: () => getDocuments(filters),
  }),
)

export const documentDetailQuery = defineQueryOptions((id: string) => ({
  key: documentKeys.detail(id),
  query: () => getDocument(id),
}))
```

Consume dynamic definitions through a getter:

```ts
const route = useRoute()

const document = useQuery(() =>
  documentDetailQuery(route.params.documentId as string),
)
```

The key returned by `defineQueryOptions()` is tagged with the query result type.
Reuse it so cache calls infer data:

```ts
const options = documentDetailQuery(id)
const current = queryCache.getQueryData(options.key)
queryCache.setQueryData(options.key, updatedDocument)
```

`defineQueryOptions()` accepts static options or a function that returns
options. Its definition itself does not accept reactive getters. Put reactivity
around the call to the defined option via `useQuery(() => ...)`.

## Local Overrides

Spread defined options inside a reactive getter when one component needs a
local override:

```ts
useQuery(() => ({
  ...documentDetailQuery(route.params.documentId as string),
  enabled: Boolean(route.params.documentId),
  staleTime: 30_000,
}))
```

Keep identity and fetching logic in the domain definition. Limit local
overrides to lifecycle or presentation needs such as `enabled`,
`placeholderData`, or freshness.

## `defineQueryOptions()` Versus `defineQuery()`

Use `defineQueryOptions()` when:

- Multiple components use the same request definition.
- The query accepts component-local parameters.
- Cache operations or prefetching need a typed, reusable key.

Use `defineQuery()` when:

- Multiple simultaneously mounted consumers must share extra reactive state.
- The returned interface composes a query with globally shared refs or derived
  behavior.

Do not wrap a global query and component-local ref in an ordinary composable:
the first instance can own the query while later instances hold disconnected
refs. Use `defineQuery()` for shared extra state.

Avoid placing `useQuery()` directly in a long-lived Pinia store. If a store
only needs current cached data, read through `useQueryCache()` instead.

## Pausing and Refreshing

Use reactive `enabled` when required input is temporarily absent:

```ts
useQuery(() => ({
  ...documentDetailQuery(route.params.documentId as string),
  enabled: 'documentId' in route.params,
}))
```

Prefer `refresh()` for user interfaces and lifecycle refreshes because it
reuses an in-flight request and respects `staleTime`. Reserve `refetch()` for an
explicit force-refresh action.

## Source Pages

- https://pinia-colada.esm.dev/guide/queries.md
- https://pinia-colada.esm.dev/guide/query-keys.md
- https://pinia-colada.esm.dev/advanced/reusable-queries.md
