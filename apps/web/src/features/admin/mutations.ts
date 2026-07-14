import type { CreateRole, UpdateRole } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { fail } from '@/features/admin/admin.utils'
import { ADMIN_KEYS } from '@/features/admin/queries'
import { api } from '@/shared/api/client'

// role assignments change per-role user counts, and role edits change how
// user rows display their role, so both caches refresh together
function useAdminRefresh() {
  const queryCache = useQueryCache()
  return () => Promise.all([
    queryCache.invalidateQueries({ key: ADMIN_KEYS.users }),
    queryCache.invalidateQueries({ key: ADMIN_KEYS.roles })
  ])
}

export function useAdminUserMutations() {
  const refresh = useAdminRefresh()

  return {
    changeRole: useMutation({
      mutation: async ({ id, roleId }: { id: string, roleId: string }) => {
        const { error, response } = await api.PATCH('/api/v1/admin/users/{id}/role', { params: { path: { id } }, body: { roleId } })
        await fail(response, error)
      },
      onSuccess: refresh
    }),
    remove: useMutation({
      mutation: async (id: string) => {
        const { error, response } = await api.DELETE('/api/v1/admin/users/{id}', { params: { path: { id } } })
        await fail(response, error)
      },
      onSuccess: refresh
    })
  }
}

export function useRoleMutations(onSaved?: () => void) {
  const refresh = useAdminRefresh()

  return {
    create: useMutation({
      mutation: async (body: CreateRole) => {
        const { error, response } = await api.POST('/api/v1/admin/roles/', { body })
        await fail(response, error)
      },
      onSuccess: () => {
        onSaved?.()
        return refresh()
      }
    }),
    update: useMutation({
      mutation: async ({ id, ...body }: UpdateRole & { id: string }) => {
        const { error, response } = await api.PATCH('/api/v1/admin/roles/{id}', { params: { path: { id } }, body })
        await fail(response, error)
      },
      onSuccess: () => {
        onSaved?.()
        return refresh()
      }
    }),
    remove: useMutation({
      mutation: async (id: string) => {
        const { error, response } = await api.DELETE('/api/v1/admin/roles/{id}', { params: { path: { id } } })
        await fail(response, error)
      },
      onSuccess: refresh
    })
  }
}
