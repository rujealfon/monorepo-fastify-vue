import type { CreateRole, UpdateRole } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { ROLE_KEYS } from '@/features/roles/queries'

import { fail } from '@/features/roles/roles.utils'
import { ADMIN_USER_KEYS } from '@/features/users'
import { api } from '@/shared/api/client'

export function useRoleMutations(onSaved?: () => void) {
  const queryCache = useQueryCache()
  // role edits also change how user rows display their role
  const refresh = () => Promise.all([
    queryCache.invalidateQueries({ key: ROLE_KEYS.root }),
    queryCache.invalidateQueries({ key: ADMIN_USER_KEYS.root })
  ])

  return {
    create: useMutation({
      mutation: async (body: CreateRole) => fail((await api.POST('/api/v1/admin/roles/', { body })).response),
      onSuccess: () => {
        onSaved?.()
        return refresh()
      }
    }),
    update: useMutation({
      mutation: async ({ id, ...body }: UpdateRole & { id: string }) =>
        fail((await api.PATCH('/api/v1/admin/roles/{id}', { params: { path: { id } }, body })).response),
      onSuccess: () => {
        onSaved?.()
        return refresh()
      }
    }),
    remove: useMutation({
      mutation: async (id: string) =>
        fail((await api.DELETE('/api/v1/admin/roles/{id}', { params: { path: { id } } })).response),
      onSuccess: refresh
    })
  }
}
