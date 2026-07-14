import { defineQueryOptions } from '@pinia/colada'

import { api, fail } from '@/shared/api/client'

export const ACCESS_KEYS = {
  root: ['access-control'] as const,
  users: (page: number) => [...ACCESS_KEYS.root, 'users', { page }] as const,
  roles: ['access-control', 'roles'] as const,
  permissions: ['access-control', 'permissions'] as const
}

export const usersQuery = defineQueryOptions((page: number) => ({
  key: ACCESS_KEYS.users(page),
  query: async () => {
    const { data, error, response } = await api.GET('/api/v1/admin/users', { params: { query: { page, limit: 20 } } })
    await fail(response, error)
    return data!
  },
  placeholderData: previous => previous
}))

export const rolesQuery = defineQueryOptions({
  key: ACCESS_KEYS.roles,
  query: async () => {
    const { data, error, response } = await api.GET('/api/v1/admin/roles')
    await fail(response, error)
    return data!
  }
})

export const permissionsQuery = defineQueryOptions({
  key: ACCESS_KEYS.permissions,
  query: async () => {
    const { data, error, response } = await api.GET('/api/v1/admin/permissions')
    await fail(response, error)
    return data!
  }
})
