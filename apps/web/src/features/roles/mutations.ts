import type { CreateRole, ReplaceRolePermissions, ReplaceUserRoles, UpdateRole } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { AUTHORIZATION_KEY } from '@/features/permissions'
import { ROLE_KEYS, USER_KEYS } from '@/features/roles/queries'
import { api } from '@/shared/api/client'
import { fail } from '@/shared/api/fail'

export function useRoleMutations(onCreate?: () => void) {
  const queryCache = useQueryCache()
  const refresh = () => Promise.all([
    queryCache.invalidateQueries({ key: ROLE_KEYS.root }),
    queryCache.invalidateQueries({ key: AUTHORIZATION_KEY })
  ])

  return {
    create: useMutation({
      mutation: async (body: CreateRole) => {
        const { data, error, response } = await api.POST('/api/v1/roles/', { body })
        await fail(response, error)
        return data
      },
      onSuccess: () => onCreate?.(),
      onSettled: refresh
    }),
    update: useMutation({
      mutation: async ({ roleId, ...body }: UpdateRole & { roleId: number }) => {
        const { data, error, response } = await api.PATCH('/api/v1/roles/{roleId}', { params: { path: { roleId } }, body })
        await fail(response, error)
        return data
      },
      onSettled: refresh
    }),
    remove: useMutation({
      mutation: async (roleId: number) => {
        const { error, response } = await api.DELETE('/api/v1/roles/{roleId}', { params: { path: { roleId } } })
        await fail(response, error)
      },
      onSettled: refresh
    }),
    replacePermissions: useMutation({
      mutation: async ({ roleId, ...body }: ReplaceRolePermissions & { roleId: number }) => {
        const { data, error, response } = await api.PUT('/api/v1/roles/{roleId}/permissions', { params: { path: { roleId } }, body })
        await fail(response, error)
        return data
      },
      onSettled: refresh
    })
  }
}

export function useUserRoleMutations() {
  const queryCache = useQueryCache()

  return {
    replaceRoles: useMutation({
      mutation: async ({ userId, ...body }: ReplaceUserRoles & { userId: string }) => {
        const { data, error, response } = await api.PUT('/api/v1/users/{userId}/roles', { params: { path: { userId } }, body })
        await fail(response, error)
        return data
      },
      onSettled: () => Promise.all([
        queryCache.invalidateQueries({ key: USER_KEYS.root }),
        queryCache.invalidateQueries({ key: AUTHORIZATION_KEY })
      ])
    })
  }
}
