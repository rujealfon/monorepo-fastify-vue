import { RpcError } from '@monorepo-fastify-vue/api-client'
import { describe, expect, it, vi } from 'vitest'

import { permissionsQuery, rolesQuery, usersQuery } from './queries'

const api = vi.hoisted(() => ({ GET: vi.fn() }))
vi.mock('@/shared/api/client', async importOriginal => ({
  ...await importOriginal<typeof import('@/shared/api/client')>(),
  api
}))

describe('access-control queries', () => {
  it('loads paginated users, roles and permissions', async () => {
    const response = { ok: true, status: 200 }
    const users = { data: [], pagination: { page: 2, limit: 20, total: 0, totalPages: 0 } }
    const roles = [{ id: '1', name: 'user', permissions: [] }]
    const permissions = [{ id: '2', key: 'tasks.read', description: 'Read tasks' }]
    api.GET
      .mockResolvedValueOnce({ data: users, response })
      .mockResolvedValueOnce({ data: roles, response })
      .mockResolvedValueOnce({ data: permissions, response })

    await expect(usersQuery(2).query({} as never)).resolves.toEqual(users)
    await expect(rolesQuery.query({} as never)).resolves.toEqual(roles)
    await expect(permissionsQuery.query({} as never)).resolves.toEqual(permissions)
    expect(api.GET).toHaveBeenNthCalledWith(1, '/api/v1/admin/users', { params: { query: { page: 2, limit: 20 } } })
  })

  it('throws typed API failures', async () => {
    api.GET.mockResolvedValue({ response: { ok: false, status: 403 } })
    await expect(rolesQuery.query({} as never)).rejects.toBeInstanceOf(RpcError)
  })
})
