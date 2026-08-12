import type { User } from '@monorepo-fastify-vue/api-client'

import { defineQueryOptions, useQuery, useQueryCache } from '@pinia/colada'

import { sessionClient } from '@/shared/api/client'

export const SESSION_KEY = ['session', 'user'] as const

export const currentUserQuery = defineQueryOptions({
  key: SESSION_KEY,
  query: (): Promise<User | null> => sessionClient.currentUser(),
  staleTime: 30_000
})

export function useSessionState() {
  return useQuery(currentUserQuery)
}

export async function checkSessionAccess() {
  const cache = useQueryCache()
  try {
    const state = await cache.refresh(cache.ensure(currentUserQuery))
    return state.status === 'success'
      ? { status: state.data ? 'authenticated' as const : 'guest' as const, user: state.data }
      : { status: 'unavailable' as const, error: state.error }
  }
  catch (error) {
    // Pinia Colada intentionally retains stale data on refresh failure. Access
    // policy reports the outage separately so callers never erase that User.
    return { status: 'unavailable' as const, error }
  }
}
