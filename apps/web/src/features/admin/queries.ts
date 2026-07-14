import { defineQueryOptions } from '@pinia/colada'

import { fail } from '@/features/admin/admin.utils'
import { api } from '@/shared/api/client'

export const ADMIN_KEYS = {
  users: ['admin-users'] as const,
  usersPage: (page: number) => [...ADMIN_KEYS.users, { page }] as const,
  roles: ['admin-roles'] as const,
  rolesList: () => [...ADMIN_KEYS.roles, 'list'] as const,
  permissions: () => [...ADMIN_KEYS.roles, 'permissions'] as const
}

export const adminUsersQuery = defineQueryOptions((page: number) => ({
  key: ADMIN_KEYS.usersPage(page),
  query: async () => {
    const { data, error, response } = await api.GET('/api/v1/admin/users/', { params: { query: { page, limit: 20 } } })
    await fail(response, error)
    return data
  },
  placeholderData: previous => previous
}))

export const rolesQuery = defineQueryOptions({
  key: ADMIN_KEYS.rolesList(),
  query: async () => {
    const { data, error, response } = await api.GET('/api/v1/admin/roles/')
    await fail(response, error)
    return data
  }
})

export const permissionsQuery = defineQueryOptions({
  key: ADMIN_KEYS.permissions(),
  query: async () => {
    const { data, error, response } = await api.GET('/api/v1/admin/permissions/')
    await fail(response, error)
    return data
  },
  staleTime: 5 * 60 * 1000
})
