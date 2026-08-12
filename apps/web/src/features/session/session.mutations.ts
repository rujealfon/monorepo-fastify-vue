import type { LoginUser, RegisterUser, UpdateProfile } from '@monorepo-fastify-vue/api-client'

import { useMutation, useQueryCache } from '@pinia/colada'

import { sessionClient } from '@/shared/api/client'

import { SESSION_KEY } from './session.query'

function cancelCurrentUser(cache: ReturnType<typeof useQueryCache>) {
  cache.cancelQueries({ key: SESSION_KEY, exact: true })
}

export function useRegister() {
  return useMutation({ mutation: (body: RegisterUser) => sessionClient.register(body) })
}

export function useLogin() {
  const cache = useQueryCache()
  return useMutation({
    mutation: (body: LoginUser) => sessionClient.login(body),
    onMutate: () => cancelCurrentUser(cache),
    onSuccess: user => cache.setQueryData(SESSION_KEY, user)
  })
}

export function useLogout() {
  const cache = useQueryCache()
  return useMutation({
    mutation: () => sessionClient.logout(),
    onMutate: () => cancelCurrentUser(cache),
    onSuccess: () => cache.setQueryData(SESSION_KEY, null)
  })
}

export function useUpdateProfile() {
  const cache = useQueryCache()
  return useMutation({
    mutation: (body: UpdateProfile) => sessionClient.updateProfile(body),
    onMutate: () => cancelCurrentUser(cache),
    onSuccess: user => cache.setQueryData(SESSION_KEY, user)
  })
}
