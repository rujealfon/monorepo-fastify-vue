import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import UsersView from './UsersView.vue'

Element.prototype.scrollIntoView = vi.fn()

const api = vi.hoisted(() => ({ GET: vi.fn(), PUT: vi.fn() }))
vi.mock('@/shared/api/client', async importOriginal => ({
  ...await importOriginal<typeof import('@/shared/api/client')>(),
  api
}))

const session = {
  id: 'delegate-1',
  email: 'delegate@example.com',
  profile: {},
  roles: [{ id: 'role-manager-role', name: 'role-manager', system: false }],
  permissions: ['users.roles.update', 'roles.read'],
  createdAt: '',
  updatedAt: ''
}

const target = {
  id: 'target-1',
  email: 'target@example.com',
  createdAt: '',
  updatedAt: '',
  roles: [
    { id: 'user-role', name: 'user', system: true },
    { id: 'task-reader-role', name: 'task-reader', system: false }
  ]
}

const roles = [
  { id: 'user-role', name: 'user', system: true, description: null, permissions: [] },
  { id: 'admin-role', name: 'admin', system: true, description: null, permissions: [] },
  { id: 'task-reader-role', name: 'task-reader', system: false, description: null, permissions: [] },
  { id: 'other-role', name: 'other-role', system: false, description: null, permissions: [] }
]

describe('usersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const response = { ok: true, status: 200 }
    api.GET.mockImplementation(async (url: string) => {
      if (url === '/api/v1/profile/')
        return { data: session, response }
      if (url === '/api/v1/admin/users')
        return { data: { data: [target], pagination: { page: 1, limit: 20, total: 1, totalPages: 0 } }, response }
      if (url === '/api/v1/admin/roles')
        return { data: roles, response }
      throw new Error(`Unexpected GET ${url}`)
    })
    api.PUT.mockResolvedValue({ data: target, response })
  })

  it('hides system roles from a non-admin role-manager\'s options, but preserves an existing hidden system role when toggling a visible one', async () => {
    const wrapper = mount(UsersView, {
      global: { plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]] }
    })
    await flushPromises()

    // admin is a system role and should not be offered to a non-admin role-manager.
    expect(wrapper.text()).not.toContain('admin')

    // Open the combobox for the target row and toggle on the visible "other-role" item.
    await wrapper.get(`[aria-label="Roles for ${target.email}"]`).trigger('click')
    await flushPromises()

    const otherRoleItem = [...document.body.querySelectorAll('[role="option"]')].find(item => item.textContent?.includes('other-role')) as HTMLElement
    expect(otherRoleItem).toBeDefined()
    otherRoleItem.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(api.PUT).toHaveBeenCalledWith('/api/v1/admin/users/{id}/roles', {
      params: { path: { id: target.id } },
      body: { roleIds: expect.arrayContaining(['user-role', 'task-reader-role', 'other-role']) }
    })
  })
})
