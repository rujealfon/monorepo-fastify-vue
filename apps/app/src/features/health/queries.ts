import { RpcError } from '@monorepo-fastify-vue/api-client'
import { defineQueryOptions } from '@pinia/colada'

import { api } from '@/shared/api/client'

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
  },
  // Health is volatile — the global 30s staleTime is too long here, and
  // autoRefetch re-checks automatically while the page stays mounted.
  staleTime: 5_000,
  autoRefetch: true
})
