import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import UsersView from './UsersView.vue'

const api = vi.hoisted(() => ({
  DELETE: vi.fn(),
  GET: vi.fn(),
  PATCH: vi.fn(),
  POST: vi.fn()
}))

vi.mock('@/shared/api/client', () => ({ api }))

const response = { ok: true, status: 200 }

const roleRefs = {
  user: { id: 'role-user', name: 'user', isSystem: true },
  admin: { id: 'role-admin', name: 'admin', isSystem: true },
  superAdmin: { id: 'role-super', name: 'super_admin', isSystem: true }
}

const sessionUser = {
  id: 'admin-id',
  email: 'admin@example.com',
  role: roleRefs.admin,
  permissions: ['users:read', 'users:manage', 'roles:read'],
  profile: { firstName: null, lastName: null, gender: null, birthDate: null, bio: null, createdAt: '', updatedAt: '' },
  createdAt: '',
  updatedAt: ''
}

const userRows = [
  { id: 'admin-id', email: 'admin@example.com', role: roleRefs.admin, createdAt: '2026-01-01T00:00:00Z', updatedAt: '' },
  { id: 'super-id', email: 'super@example.com', role: roleRefs.superAdmin, createdAt: '2026-01-01T00:00:00Z', updatedAt: '' },
  { id: 'user-id', email: 'user@example.com', role: roleRefs.user, createdAt: '2026-01-01T00:00:00Z', updatedAt: '' }
]

const rolesList = {
  data: [
    { ...roleRefs.user, description: null, permissions: [], userCount: 1, createdAt: '', updatedAt: '' },
    { ...roleRefs.admin, description: null, permissions: ['users:read'], userCount: 1, createdAt: '', updatedAt: '' },
    { ...roleRefs.superAdmin, description: null, permissions: [], userCount: 1, createdAt: '', updatedAt: '' }
  ]
}

function mountView() {
  return mount(UsersView, {
    global: { plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]] }
  })
}

describe('usersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.GET.mockImplementation(async (url: string) => {
      if (url === '/api/v1/profile/')
        return { data: sessionUser, response }
      if (url === '/api/v1/admin/roles/')
        return { data: rolesList, response }
      return {
        data: {
          data: userRows,
          pagination: { page: 1, limit: 20, total: 3, totalPages: 1 }
        },
        response
      }
    })
    api.PATCH.mockResolvedValue({ data: userRows[2], response })
    api.DELETE.mockResolvedValue({ response: { ok: true, status: 204 } })
  })

  it('lists users and only shows controls for manageable rows', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(api.GET).toHaveBeenCalledWith('/api/v1/admin/users/', { params: { query: { page: 1, limit: 20 } } })
    expect(wrapper.text()).toContain('super@example.com')
    expect(wrapper.text()).toContain('user@example.com')

    // admin actor: no controls on self or super admin holders, controls on the standard user
    expect(wrapper.find('[aria-label="Role for admin@example.com"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Role for super@example.com"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Role for user@example.com"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Delete user@example.com"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('You')
  })

  it('deletes a user after confirmation', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('[aria-label="Delete user@example.com"]').trigger('click')
    await flushPromises()

    const confirm = [...document.body.querySelectorAll('button')]
      .find(button => button.textContent?.trim() === 'Delete')
    expect(confirm).toBeDefined()
    confirm!.click()
    await flushPromises()

    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/admin/users/{id}', { params: { path: { id: 'user-id' } } })
  })

  it('shows query failures', async () => {
    api.GET.mockImplementation(async (url: string) => {
      if (url === '/api/v1/profile/')
        return { data: sessionUser, response }
      if (url === '/api/v1/admin/roles/')
        return { data: rolesList, response }
      return { response: { ok: false, status: 503 } }
    })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('API request failed with HTTP 503')
  })
})
