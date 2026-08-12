import type { User } from '@monorepo-fastify-vue/api-client'

import { defineQueryOptions, useQuery, useQueryCache } from '@pinia/colada'

import { sessionClient } from '@/shared/api/client'

export const SESSION_KEY = ['session', 'user'] as const

export const currentUserQuery = defineQueryOptions({
  key: SESSION_KEY,
  query: (): Promise<User | null> => sessionClient.currentUser(),
  staleTime: 30_000
})

export function useCurrentUser() {
  return useQuery(currentUserQuery)
}

export async function refreshCurrentUser() {
  const cache = useQueryCache()
  const state = await cache.refresh(cache.ensure(currentUserQuery))
  return state.status === 'success' ? state.data : null
}
