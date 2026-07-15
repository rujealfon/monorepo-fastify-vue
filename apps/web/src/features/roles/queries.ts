import { defineQueryOptions } from '@pinia/colada'

import { api } from '@/shared/api/client'
import { fail } from '@/shared/api/fail'

export const ROLE_KEYS = {
  root: ['roles'] as const,
  detail: (roleId: number) => [...ROLE_KEYS.root, roleId] as const
}

export const USER_KEYS = {
  root: ['users'] as const,
  page: (page: number, search: string) => [...USER_KEYS.root, { page, search }] as const
}

export const usersQuery = defineQueryOptions(({ page, search }: { page: number, search: string }) => ({
  key: USER_KEYS.page(page, search),
  query: async () => {
    const { data, response } = await api.GET('/api/v1/users/', {
      params: { query: { page, limit: 20, ...search ? { search } : {} } }
    })
    await fail(response)
    return data
  },
  placeholderData: previous => previous
}))

export const rolesQuery = defineQueryOptions({
  key: ROLE_KEYS.root,
  query: async () => {
    const { data, response } = await api.GET('/api/v1/roles/')
    await fail(response)
    return data
  }
})

export const roleQuery = defineQueryOptions((roleId: number) => ({
  key: ROLE_KEYS.detail(roleId),
  query: async () => {
    const { data, response } = await api.GET('/api/v1/roles/{roleId}', { params: { path: { roleId } } })
    await fail(response)
    return data
  }
}))
