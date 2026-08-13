import { defineQueryOptions } from '@pinia/colada'

import { healthClient } from '@/shared/api/client'

export const HEALTH_KEYS = {
  root: ['health'] as const,
  live: () => [...HEALTH_KEYS.root, 'live'] as const
}

export const healthLiveQuery = defineQueryOptions({
  key: HEALTH_KEYS.live(),
  query: () => healthClient.live(),
  // Health is volatile — the global 30s staleTime is too long here, and
  // autoRefetch re-checks automatically while the page stays mounted.
  staleTime: 5_000,
  autoRefetch: true
})
