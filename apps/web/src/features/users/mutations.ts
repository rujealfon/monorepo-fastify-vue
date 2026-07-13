import { useMutation, useQueryCache } from '@pinia/colada'

import { ROLE_KEYS } from '@/features/roles'
import { ADMIN_USER_KEYS } from '@/features/users/queries'
import { fail } from '@/features/users/users.utils'
import { api } from '@/shared/api/client'

export function useAdminUserMutations() {
  const queryCache = useQueryCache()
  // role assignments change the per-role user counts too
  const refresh = () => Promise.all([
    queryCache.invalidateQueries({ key: ADMIN_USER_KEYS.root }),
    queryCache.invalidateQueries({ key: ROLE_KEYS.root })
  ])

  return {
    changeRole: useMutation({
      mutation: async ({ id, roleId }: { id: string, roleId: string }) =>
        fail((await api.PATCH('/api/v1/admin/users/{id}/role', { params: { path: { id } }, body: { roleId } })).response),
      onSuccess: refresh
    }),
    remove: useMutation({
      mutation: async (id: string) =>
        fail((await api.DELETE('/api/v1/admin/users/{id}', { params: { path: { id } } })).response),
      onSuccess: refresh
    })
  }
}
