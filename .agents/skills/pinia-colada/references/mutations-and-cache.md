# Mutations and Cache Consistency

Read this reference for writes, invalidation, cache operations, error handling,
and optimistic updates.

## Contents

- [Mutation Execution](#mutation-execution)
- [Invalidation](#invalidation)
- [Cache Action Selection](#cache-action-selection)
- [Optimistic Update Transaction](#optimistic-update-transaction)
- [Error Handling](#error-handling)

## Mutation Execution

Pass mutation inputs explicitly:

```ts
const { mutate, mutateAsync, variables, asyncStatus } = useMutation({
  mutation: (input: UpdateDocumentInput) => updateDocument(input),
})
```

- Use `mutate(input)` for event handlers. It catches thrown errors and returns
  nothing.
- Use `await mutateAsync(input)` when the caller must await or catch the
  operation.
- Use `defineMutation()` to reuse a mutation definition or share composed
  mutation state.
- Remember that mutation state is local by default. Add a mutation `key` when
  another component must find it through `useMutationCache()`.

## Invalidation

Invalidate the smallest correct key family after a write:

```ts
const queryCache = useQueryCache()

useMutation({
  mutation: createDocument,
  onSettled: () =>
    queryCache.invalidateQueries({ key: documentKeys.lists() }),
})
```

`invalidateQueries()` marks all matching active and inactive entries stale, but
refetches active entries by default. Pass `'all'` as its second argument to
refetch inactive matches too:

```ts
await queryCache.invalidateQueries(
  { key: documentKeys.root },
  'all',
)
```

Use `{ exact: true }` to exclude child keys. Without `exact`, a key is a prefix
filter.

Await or return invalidation when the mutation should remain in a loading state
until refetch completes. Fire it without awaiting when eventual refresh is
enough and the UI may settle immediately.

## Cache Action Selection

Prefer convenience actions for routine work:

| Need | Action |
| --- | --- |
| Read one exact entry | `getQueryData(key)` |
| Write or create one successful entry | `setQueryData(key, dataOrUpdater)` |
| Match entries without subscribing | `getEntries(filters)` |
| Mark and refetch matches | `invalidateQueries(filters)` |
| Abort matching requests | `cancelQueries(filters)` |
| Update matching entries | `setQueriesData(filters, updater)` |

`cancelQueries()` is synchronous and returns `void`; call it without `await`.
`invalidateQueries()` returns a promise and can be awaited when the refetch
lifecycle matters.

Use precise entry actions (`cancel`, `remove`, `invalidate`, `fetch`, `refresh`,
`setEntryState`) only when entry-level composition is required.

Filters can combine `key`, `exact`, `active`, `stale`, `status`, and
`predicate`.

Clear safely by canceling before removal:

```ts
queryCache.cancelQueries()
queryCache.getEntries().forEach((entry) => queryCache.remove(entry))
```

Removing without canceling allows an in-flight request to resolve and recreate
state.

## Optimistic Update Transaction

Use cache optimism when multiple consumers need the optimistic state. Keep UI
optimism local when the mutation and rendered query are collocated and a
temporary row is sufficient.

For cache optimism, perform a full transaction:

```ts
useMutation({
  mutation: updateDocument,

  onMutate(input) {
    const options = documentDetailQuery(input.id)
    queryCache.cancelQueries({ key: options.key })
    const previous = queryCache.getQueryData(options.key)
    const optimistic = previous
      ? { ...previous, ...input.patch }
      : previous

    queryCache.setQueryData(options.key, optimistic)
    return { previous, optimistic, key: options.key }
  },

  onError(_error, _input, context) {
    if (
      context
      && queryCache.getQueryData(context.key) === context.optimistic
    ) {
      queryCache.setQueryData(context.key, context.previous)
    }
  },

  onSettled(_data, _error, _input, context) {
    if (context) {
      return queryCache.invalidateQueries({ key: context.key })
    }
  },
})
```

Adapt the exact order to the installed API types. Preserve these invariants:

1. Prevent an older request from overwriting the optimistic value.
2. Snapshot the previous value.
3. replace arrays and objects instead of mutating them.
4. Return rollback context from `onMutate`.
5. Roll back only if no newer update has replaced the optimistic value.
6. Reconcile with the server by invalidating or writing the returned result.

For related lists and details, update all known views with
`setQueriesData()` or invalidate the common key prefix.

## Error Handling

Pinia Colada enters an error state only when the query or mutation throws or
rejects. The browser `fetch()` API does not throw for HTTP 4xx/5xx:

```ts
async function requestDocument(id: string) {
  const response = await fetch(`/api/documents/${id}`)
  if (!response.ok) {
    throw new ApiError(response.status, response.statusText)
  }
  return response.json() as Promise<Document>
}
```

Use `state.status` for type-safe local rendering. Use mutation `onError` for
operation-specific side effects. Use `PiniaColadaQueryHooksPlugin` plus typed,
serializable query `meta` for centralized query logging or notifications.

Set the global default error through `TypesConfig.defaultError` when the app has
a consistent error type; use `unknown` to require explicit narrowing. Errors
cannot be typed per query, so narrow special cases with `instanceof` or another
runtime predicate.

## Source Pages

- https://pinia-colada.esm.dev/guide/mutations.md
- https://pinia-colada.esm.dev/guide/query-invalidation.md
- https://pinia-colada.esm.dev/guide/optimistic-updates.md
- https://pinia-colada.esm.dev/advanced/query-cache.md
- https://pinia-colada.esm.dev/guide/error-handling.md
