import type { User } from '@monorepo-fastify-vue/api-client'
import { defineQueryOptions } from '@pinia/colada'

import { api } from '@/shared/api/client'
import { unwrap } from '@/shared/api/fail'

export const PROFILE_KEY = ['profile'] as const

export const profileQuery = defineQueryOptions({
  key: PROFILE_KEY,
  query: async (): Promise<User | null> => {
    const { data, error, response } = await api.GET('/api/v1/profile/')
    if (response.status === 401 || response.status === 403)
      return null
    return unwrap(response, data, error)
  },
  staleTime: 30_000
})
