import { defineQueryOptions } from '@pinia/colada'

import { fail } from '@/features/users/users.utils'
import { api } from '@/shared/api/client'

export const ADMIN_USER_KEYS = {
  root: ['admin-users'] as const,
  page: (page: number) => [...ADMIN_USER_KEYS.root, { page }] as const
}

export const adminUsersQuery = defineQueryOptions((page: number) => ({
  key: ADMIN_USER_KEYS.page(page),
  query: async () => {
    const { data, response } = await api.GET('/api/v1/admin/users/', { params: { query: { page, limit: 20 } } })
    await fail(response)
    return data
  },
  placeholderData: previous => previous
}))

export const ADMIN_ROLE_KEYS = {
  root: ['admin-roles'] as const
}

export const adminRolesQuery = defineQueryOptions({
  key: ADMIN_ROLE_KEYS.root,
  query: async () => {
    const { data, response } = await api.GET('/api/v1/admin/roles/')
    await fail(response)
    return data
  }
})
