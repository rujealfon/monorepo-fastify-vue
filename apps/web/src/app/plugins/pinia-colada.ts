import type { PiniaColadaOptions } from '@pinia/colada'

import { PiniaColadaAutoRefetch } from '@pinia/colada-plugin-auto-refetch'

// Query functions can reject with API, network, parsing, or runtime errors.
// Keep the global type honest and narrow errors at their point of use.
declare module '@pinia/colada' {
  // eslint-disable-next-line ts/consistent-type-definitions -- module augmentation requires interface merging
  interface TypesConfig {
    defaultError: unknown
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
