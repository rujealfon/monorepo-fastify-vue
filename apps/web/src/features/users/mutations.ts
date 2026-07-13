import type { Role } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { ADMIN_USER_KEYS } from '@/features/users/queries'
import { fail } from '@/features/users/users.utils'
import { api } from '@/shared/api/client'

export function useAdminUserMutations() {
  const queryCache = useQueryCache()
  const refresh = () => queryCache.invalidateQueries({ key: ADMIN_USER_KEYS.root })

  return {
    changeRole: useMutation({
      mutation: async ({ id, role }: { id: string, role: Role['slug'] }) =>
        fail((await api.PATCH('/api/v1/admin/users/{id}/role', { params: { path: { id } }, body: { role } })).response),
      onSuccess: refresh
    }),
    remove: useMutation({
      mutation: async (id: string) =>
        fail((await api.DELETE('/api/v1/admin/users/{id}', { params: { path: { id } } })).response),
      onSuccess: refresh
    })
  }
}
