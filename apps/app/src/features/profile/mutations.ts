import type { UpdateProfile } from '@monorepo-fastify-vue/api-client'
import { RpcError } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { api } from '@/shared/api/client'

import { PROFILE_KEY } from './queries'

export function useProfileMutation() {
  const cache = useQueryCache()
  return useMutation({
    mutation: async (body: UpdateProfile) => {
      const { data, error, response } = await api.PATCH('/api/v1/profile/', { body })
      if (!response.ok || !data)
        throw new RpcError(response.status, error)
      return data
    },
    onSuccess: user => cache.setQueryData(PROFILE_KEY, user)
  })
}
