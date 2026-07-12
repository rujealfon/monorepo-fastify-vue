import type { UpdateProfile } from '@monorepo-fastify-vue/api-client'
import { RpcError } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { SESSION_KEY } from '@/features/auth'
import { api } from '@/shared/api/client'

export function useProfileMutation() {
  const cache = useQueryCache()
  return useMutation({
    mutation: async (body: UpdateProfile) => {
      const { data, response } = await api.PATCH('/api/v1/profile/', { body })
      if (!response.ok || !data)
        throw new RpcError(response.status)
      return data
    },
    onSuccess: user => cache.setQueryData(SESSION_KEY, user)
  })
}
