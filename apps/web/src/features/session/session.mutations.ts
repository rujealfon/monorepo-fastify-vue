import type { LoginUser, RegisterUser, UpdateProfile } from '@monorepo-fastify-vue/api-client'

import { useMutation, useQueryCache } from '@pinia/colada'

import { sessionClient } from '@/shared/api/client'

import { SESSION_KEY } from './session.query'

function cancelCurrentUser(cache: ReturnType<typeof useQueryCache>) {
  cache.cancelQueries({ key: SESSION_KEY, exact: true })
}

export function useSessionActions() {
  const cache = useQueryCache()
  const register = useMutation({ mutation: (body: RegisterUser) => sessionClient.register(body) })
  const login = useMutation({
    mutation: (body: LoginUser) => sessionClient.login(body),
    onMutate: () => cancelCurrentUser(cache),
    onSuccess: user => cache.setQueryData(SESSION_KEY, user)
  })
  const logout = useMutation({
    mutation: () => sessionClient.logout(),
    onMutate: () => cancelCurrentUser(cache),
    onSuccess: () => cache.setQueryData(SESSION_KEY, null)
  })
  const updateProfile = useMutation({
    mutation: (body: UpdateProfile) => sessionClient.updateProfile(body),
    onMutate: () => cancelCurrentUser(cache),
    onSuccess: user => cache.setQueryData(SESSION_KEY, user)
  })

  return { login, logout, register, updateProfile }
}
