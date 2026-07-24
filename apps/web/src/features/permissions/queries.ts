import type { Authorization } from '@monorepo-fastify-vue/api-client'
import { RpcError } from '@monorepo-fastify-vue/api-client'
import { defineQueryOptions } from '@pinia/colada'

import { api } from '@/shared/api/client'
import { fail } from '@/shared/api/fail'

export const AUTHORIZATION_KEY = ['authorization'] as const
export const ABILITY_RULES_KEY = ['ability-rules'] as const
export const AUTHORIZATION_CATALOG_KEY = ['authorization-catalog'] as const

export const authorizationQuery = defineQueryOptions({
  key: AUTHORIZATION_KEY,
  query: async (): Promise<Authorization | null> => {
    const { data, response } = await api.GET('/api/v1/me/authorization')
    if (response.status === 401 || response.status === 403)
      return null
    if (!response.ok)
      throw new RpcError(response.status)
    return data ?? null
  },
  staleTime: 30_000
})

export const abilityRulesQuery = defineQueryOptions({
  key: ABILITY_RULES_KEY,
  query: async () => {
    const { data, response } = await api.GET('/api/v1/ability-rules/')
    await fail(response)
    return data
  }
})

export const authorizationCatalogQuery = defineQueryOptions({
  key: AUTHORIZATION_CATALOG_KEY,
  query: async () => {
    const { data, response } = await api.GET('/api/v1/authorization/catalog')
    await fail(response)
    return data
  },
  staleTime: Number.POSITIVE_INFINITY
})
