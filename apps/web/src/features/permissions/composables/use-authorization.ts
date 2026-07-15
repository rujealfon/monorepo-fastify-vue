import type { PermissionKey } from '@monorepo-fastify-vue/api-client'
import { useQuery } from '@pinia/colada'

import { can, canAll, canAny } from '@/features/permissions/permissions.utils'
import { authorizationQuery } from '@/features/permissions/queries'

export function useAuthorization() {
  const query = useQuery(authorizationQuery)

  return {
    authorization: query.data,
    isLoading: query.isLoading,
    can: (permission: PermissionKey) => can(query.data.value, permission),
    canAll: (permissions: readonly PermissionKey[]) => canAll(query.data.value, permissions),
    canAny: (permissions: readonly PermissionKey[]) => canAny(query.data.value, permissions)
  }
}
