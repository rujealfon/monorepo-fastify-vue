import type { RpcError } from '@monorepo-fastify-vue/api-client'
import type { PiniaColadaOptions } from '@pinia/colada'

import { PiniaColadaAutoRefetch } from '@pinia/colada-plugin-auto-refetch'

// Every query and mutation normalizes both transport and HTTP failures to
// RpcError through the api-client — type `error` accordingly across the app.
declare module '@pinia/colada' {
  // eslint-disable-next-line ts/consistent-type-definitions -- module augmentation requires interface merging
  interface TypesConfig {
    defaultError: RpcError
  }
}

export const coladaOptions: PiniaColadaOptions = {
  // Enables per-query `autoRefetch` (off by default) — see health queries.
  plugins: [PiniaColadaAutoRefetch()],
  queryOptions: {
    // Data counts as fresh for 30s — no automatic refetch within that window.
    staleTime: 30_000
  }
}
