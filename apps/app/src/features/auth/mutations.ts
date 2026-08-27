import type { LoginUser, RegisterUser, User } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { PROFILE_KEY } from '@/features/profile'
import { api } from '@/shared/api/client'
import { assertOk, unwrap } from '@/shared/api/fail'

export function useAuthMutations() {
  const cache = useQueryCache()
  const signedIn = (user: User) => cache.setQueryData(PROFILE_KEY, user)

  return {
    register: useMutation({
      mutation: async (body: RegisterUser) => {
        const { error, response } = await api.POST('/api/v1/auth/register', { body })
        assertOk(response, error)
      }
    }),
    login: useMutation({
      mutation: async (body: LoginUser) => {
        const { data, error, response } = await api.POST('/api/v1/auth/login', { body })
        return unwrap(response, data, error)
      },
      onSuccess: signedIn
    }),
    logout: useMutation({
      mutation: async () => {
        const { error, response } = await api.POST('/api/v1/auth/logout')
        assertOk(response, error)
      },
      onSuccess: () => cache.setQueryData(PROFILE_KEY, null)
    })
  }
}
