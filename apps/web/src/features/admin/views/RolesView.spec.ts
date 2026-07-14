import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import RolesView from './RolesView.vue'

const api = vi.hoisted(() => ({
  DELETE: vi.fn(),
  GET: vi.fn(),
  PATCH: vi.fn(),
  POST: vi.fn()
}))

vi.mock('@/shared/api/client', async importOriginal => ({
  ...await importOriginal<typeof import('@/shared/api/client')>(),
  api
}))

const response = { ok: true, status: 200 }
const permission = {
  id: '11111111-1111-4111-8111-111111111111',
  key: 'tasks.read',
  description: 'Read tasks',
  conditionFields: ['actor.id', 'task.ownerId']
}
const role = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'task-viewer',
  description: 'Views every task',
  system: false,
  createdAt: '',
  updatedAt: '',
  policies: [{
    id: '33333333-3333-4333-8333-333333333333',
    roleId: '22222222-2222-4222-8222-222222222222',
    permissionId: permission.id,
    effect: 'allow',
    condition: null,
    permission: { id: permission.id, key: permission.key, description: permission.description }
  }]
}

describe('rolesView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.GET.mockImplementation((path: string) => Promise.resolve({
      data: path === '/api/v1/profile/'
        ? { permissions: ['roles.read', 'roles.update', 'permissions.read'] }
        : path === '/api/v1/admin/roles'
          ? [role]
          : [permission],
      response
    }))
    api.PATCH.mockResolvedValue({ data: role, response })
  })

  it('displays and serializes assigned task policies', async () => {
    const wrapper = mount(RolesView, {
      attachTo: document.body,
      global: {
        plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('allow: tasks.read')
    await wrapper.get('button[aria-label="Edit task-viewer"]').trigger('click')
    await flushPromises()
    document.querySelector('#role-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()

    expect(api.PATCH).toHaveBeenCalledWith('/api/v1/admin/roles/{id}', {
      params: { path: { id: role.id } },
      body: {
        name: 'task-viewer',
        description: 'Views every task',
        permissionPolicies: [{ permissionId: permission.id, effect: 'allow', condition: null }]
      }
    })
    wrapper.unmount()
  })
})
