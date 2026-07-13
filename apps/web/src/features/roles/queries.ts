import { defineQueryOptions } from '@pinia/colada'

import { fail } from '@/features/roles/roles.utils'
import { api } from '@/shared/api/client'

export const ROLE_KEYS = {
  root: ['admin-roles'] as const,
  list: () => [...ROLE_KEYS.root, 'list'] as const,
  permissions: () => [...ROLE_KEYS.root, 'permissions'] as const
}

export const rolesQuery = defineQueryOptions({
  key: ROLE_KEYS.list(),
  query: async () => {
    const { data, response } = await api.GET('/api/v1/admin/roles/')
    await fail(response)
    return data
  }
})

export const permissionsQuery = defineQueryOptions({
  key: ROLE_KEYS.permissions(),
  query: async () => {
    const { data, response } = await api.GET('/api/v1/admin/permissions/')
    await fail(response)
    return data
  },
  staleTime: 5 * 60 * 1000
})
