# Diagnostics

Read this reference when Pinia Colada emits a stable diagnostic code or cache
behavior suggests an invalid lifecycle.

## Triage Workflow

1. Record the complete `PINIA_COLADA_*` code and the first application frame.
2. Confirm the installed Pinia Colada version and inspect its bundled types.
3. Map the code below before changing application state or suppressing output.
4. Reproduce in development because most diagnostics are removed from
   production builds.
5. Test the corrected injection, cache, or effect-scope lifecycle.

## Code Map

| Code | Meaning | Corrective direction |
| --- | --- | --- |
| `PINIA_COLADA_C0001` | Colada cannot find the root Pinia plugin | Install Pinia before Colada or pass the exact Pinia instance |
| `PINIA_COLADA_R0001` | A cache composable ran outside injection context | Resolve it in setup, a store, or a navigation guard; otherwise pass Pinia explicitly |
| `PINIA_COLADA_R0002` | Query or mutation cache state was replaced directly | Use cache actions; cancel pending work before removing entries |
| `PINIA_COLADA_R0003` | A query used an empty key | Return at least one stable segment and use `enabled` while required input is absent |
| `PINIA_COLADA_R0004` | `fetch()` or `refresh()` received an entry without options | Initialize through `useQuery()` or `ensure(options)` before fetching |
| `PINIA_COLADA_R0005` | A low-level mutation entry was used before `ensure()` | Ensure a created entry with its variables before mutating |
| `PINIA_COLADA_R0006` | A low-level mutation entry was reused | Re-ensure before every call so each execution receives a fresh entry |
| `PINIA_COLADA_R0007` | A `defineMutation()` result ran outside an effect scope | Call it from component setup, a store, or an explicit effect scope |
| `PINIA_COLADA_R0008` | Previous-page loading lacks `getPreviousPageParam()` | Define the getter or stop calling `loadPreviousPage()` |
| `PINIA_COLADA_R0009` | Infinite loading cannot find its query entry | Keep the query active and guard callbacks that outlive or change its key |

## Injection Boundaries

Call `useQueryCache()` and `useMutationCache()` synchronously where Vue
injection is available. In a Nuxt plugin, resolve the cache in the plugin body
and close over it in later watchers or callbacks. Do not resolve it lazily
inside those callbacks.

When operating outside an application injection context, retain the
application's Pinia instance and call `useQueryCache(pinia)` or
`useMutationCache(pinia)`.

## Cache Removal

Never assign to the cache map or replace the store state. To remove entries,
select them with `get()` or `getEntries()`, cancel pending requests, and call
`remove(entry)`. Prefer invalidation for active entries because a mounted query
will recreate a removed entry.

## Official Source

- https://pinia-colada.esm.dev/errors.md
