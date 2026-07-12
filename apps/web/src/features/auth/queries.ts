import type { User } from '@monorepo-fastify-vue/api-client'
import { RpcError } from '@monorepo-fastify-vue/api-client'
import { defineQueryOptions } from '@pinia/colada'

import { api } from '@/shared/api/client'

export const SESSION_KEY = ['session'] as const

export const sessionQuery = defineQueryOptions({
  key: SESSION_KEY,
  query: async (): Promise<User | null> => {
    const { data, response } = await api.GET('/api/v1/profile/')
    if (response.status === 401)
      return null
    if (!response.ok)
      throw new RpcError(response.status)
    return data ?? null
  },
  staleTime: 30_000
})
