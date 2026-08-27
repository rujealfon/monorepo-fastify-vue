import type { UpdateProfile } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { api } from '@/shared/api/client'
import { unwrap } from '@/shared/api/fail'

import { PROFILE_KEY } from './queries'

export function useProfileMutation() {
  const cache = useQueryCache()
  return useMutation({
    mutation: async (body: UpdateProfile) => {
      const { data, error, response } = await api.PATCH('/api/v1/profile/', { body })
      return unwrap(response, data, error)
    },
    onSuccess: user => cache.setQueryData(PROFILE_KEY, user)
  })
}
