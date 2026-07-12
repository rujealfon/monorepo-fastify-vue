import type { LoginUser, RegisterUser, User } from '@monorepo-fastify-vue/api-client'
import { RpcError } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { api } from '@/shared/api/client'

import { SESSION_KEY } from './queries'

async function result(response: Response, data?: User) {
  if (!response.ok || !data)
    throw new RpcError(response.status)
  return data
}

export function useAuthMutations() {
  const cache = useQueryCache()
  const signedIn = (user: User) => cache.setQueryData(SESSION_KEY, user)

  return {
    register: useMutation({
      mutation: async (body: RegisterUser) => {
        const { data, response } = await api.POST('/api/v1/auth/register', { body })
        return result(response, data)
      },
      onSuccess: signedIn
    }),
    login: useMutation({
      mutation: async (body: LoginUser) => {
        const { data, response } = await api.POST('/api/v1/auth/login', { body })
        return result(response, data)
      },
      onSuccess: signedIn
    }),
    logout: useMutation({
      mutation: async () => {
        const { response } = await api.POST('/api/v1/auth/logout')
        if (!response.ok)
          throw new RpcError(response.status)
      },
      onSuccess: () => cache.setQueryData(SESSION_KEY, null)
    })
  }
}
