import type { CreateRole, ReplaceUserRoles, UpdateRole } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { ACCESS_KEYS } from '@/features/admin/queries'
import { SESSION_KEY } from '@/features/auth'
import { api, fail } from '@/shared/api/client'

export function useAccessMutations() {
  const cache = useQueryCache()
  const refresh = () => Promise.all([
    cache.invalidateQueries({ key: ACCESS_KEYS.root }),
    cache.invalidateQueries({ key: SESSION_KEY })
  ])

  return {
    replaceUserRoles: useMutation({
      mutation: async ({ id, body }: { id: string, body: ReplaceUserRoles }) => {
        const { data, error, response } = await api.PUT('/api/v1/admin/users/{id}/roles', {
          params: { path: { id } },
          body
        })
        await fail(response, error)
        return data!
      },
      onSuccess: refresh
    }),
    createRole: useMutation({
      mutation: async (body: CreateRole) => {
        const { data, error, response } = await api.POST('/api/v1/admin/roles', { body })
        await fail(response, error)
        return data!
      },
      onSuccess: refresh
    }),
    updateRole: useMutation({
      mutation: async ({ id, body }: { id: string, body: UpdateRole }) => {
        const { data, error, response } = await api.PATCH('/api/v1/admin/roles/{id}', {
          params: { path: { id } },
          body
        })
        await fail(response, error)
        return data!
      },
      onSuccess: refresh
    }),
    deleteRole: useMutation({
      mutation: async (id: string) => {
        const { error, response } = await api.DELETE('/api/v1/admin/roles/{id}', { params: { path: { id } } })
        await fail(response, error)
      },
      onSuccess: refresh
    })
  }
}
