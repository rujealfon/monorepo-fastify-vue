import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import UsersView from './UsersView.vue'

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  PUT: vi.fn()
}))

vi.mock('@/shared/api/client', () => ({ api }))

const response = { ok: true, status: 200 }
const userId = 'a3f1c2d4-5b6e-4a7f-8c9d-0e1f2a3b4c5d'

function mountView() {
  return mount(UsersView, {
    global: {
      plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]],
      stubs: {
        SelectMenu: {
          name: 'SelectMenu',
          props: ['items', 'modelValue'],
          emits: ['update:modelValue'],
          template: `
            <div>
              <button data-testid="clear-roles" @click="$emit('update:modelValue', [])">Clear</button>
              <button data-testid="replace-roles" @click="$emit('update:modelValue', [2])">Replace</button>
            </div>
          `
        }
      }
    }
  })
}

describe('usersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.GET.mockImplementation(async (url: string) => {
      if (url === '/api/v1/me/authorization') {
        return {
          data: {
            user: { id: userId, email: 'admin@example.com' },
            roles: [{ id: 1, name: 'Admin', slug: 'admin' }],
            permissions: ['users.read', 'users.assign_roles'],
            authorizationVersion: 1
          },
          response
        }
      }

      if (url === '/api/v1/roles/') {
        return {
          data: [
            { id: 1, name: 'Admin', slug: 'admin', description: null, isSystem: true, isActive: true, userCount: 1, createdAt: '', updatedAt: '' },
            { id: 2, name: 'Standard User', slug: 'standard-user', description: null, isSystem: true, isActive: true, userCount: 0, createdAt: '', updatedAt: '' }
          ],
          response
        }
      }

      return {
        data: {
          data: [{
            id: userId,
            email: 'admin@example.com',
            createdAt: '2026-07-25T00:00:00.000Z',
            roles: [{ id: 1, name: 'Admin', slug: 'admin' }]
          }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
        },
        response
      }
    })
    api.PUT.mockResolvedValue({ data: [], response })
  })

  it('prevents removing the last role while allowing a non-empty replacement', async () => {
    const wrapper = mountView()
    await flushPromises()

    const select = wrapper.getComponent({ name: 'SelectMenu' })
    expect(select.props('items')).toEqual([
      expect.objectContaining({ value: 1, disabled: true }),
      expect.objectContaining({ value: 2, disabled: false })
    ])

    await wrapper.get('[data-testid="clear-roles"]').trigger('click')
    expect(api.PUT).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="replace-roles"]').trigger('click')
    await flushPromises()
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/users/{userId}/roles', {
      params: { path: { userId } },
      body: { roleIds: [2] }
    })
  })
})
