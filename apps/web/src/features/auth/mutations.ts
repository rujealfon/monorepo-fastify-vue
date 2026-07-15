import type { ApiErrorSchema, LoginUser, RegisterUser, User } from '@monorepo-fastify-vue/api-client'
import { RpcError } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { AUTHORIZATION_KEY } from '@/features/permissions'
import { PROFILE_KEY } from '@/features/profile'
import { api } from '@/shared/api/client'

async function result(response: Response, data?: User, error?: ApiErrorSchema) {
  if (!response.ok || !data)
    throw new RpcError(response.status, error)
  return data
}

export function useAuthMutations() {
  const cache = useQueryCache()
  const signedIn = (user: User) => {
    cache.setQueryData(PROFILE_KEY, user)
    return cache.invalidateQueries({ key: AUTHORIZATION_KEY })
  }

  return {
    register: useMutation({
      mutation: async (body: RegisterUser) => {
        const { data, error, response } = await api.POST('/api/v1/auth/register', { body })
        return result(response, data, error)
      },
      onSuccess: signedIn
    }),
    login: useMutation({
      mutation: async (body: LoginUser) => {
        const { data, error, response } = await api.POST('/api/v1/auth/login', { body })
        return result(response, data, error)
      },
      onSuccess: signedIn
    }),
    logout: useMutation({
      mutation: async () => {
        const { error, response } = await api.POST('/api/v1/auth/logout')
        if (!response.ok)
          throw new RpcError(response.status, error)
      },
      onSuccess: () => {
        cache.setQueryData(PROFILE_KEY, null)
        cache.setQueryData(AUTHORIZATION_KEY, null)
      }
    })
  }
}
