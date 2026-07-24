import type { VueWrapper } from '@vue/test-utils'
import USelectMenu from '@nuxt/ui/components/SelectMenu.vue'
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
const superAdmin = {
  id: 1,
  name: 'Super Admin',
  slug: 'super-admin',
  isSystem: true,
  isActive: true
}
const admin = { id: 2, name: 'Admin', slug: 'admin', isSystem: true, isActive: true }
const standardUser = { id: 3, name: 'Standard User', slug: 'standard-user', isSystem: true, isActive: true }
const listedUserId = '00000000-0000-0000-0000-000000000002'
let listedRoles: { id: number, name: string, slug: string }[]

function mountView() {
  return mount(UsersView, {
    global: { plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]] }
  })
}

function getRoleSelect(wrapper: ReturnType<typeof mountView>) {
  return wrapper.getComponent(USelectMenu) as unknown as VueWrapper
}

describe('usersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listedRoles = [{ id: superAdmin.id, name: superAdmin.name, slug: superAdmin.slug }]
    api.PUT.mockResolvedValue({ data: [], response })
    api.GET.mockImplementation(async (url: string) => {
      if (url === '/api/v1/me/authorization') {
        return {
          data: {
            user: { id: '00000000-0000-0000-0000-000000000001', email: 'admin@example.com' },
            roles: [],
            rules: [
              { action: 'read', subject: ['User', 'Role'] },
              { action: 'update', subject: 'User' },
              { action: 'assign', subject: 'Role', conditions: { slug: { $in: ['admin', 'standard-user'] } } }
            ],
            authorizationVersion: 1
          },
          response
        }
      }
      if (url === '/api/v1/roles/') {
        return {
          data: [superAdmin, admin, standardUser],
          response
        }
      }
      return {
        data: {
          data: [{
            id: listedUserId,
            email: 'root@example.com',
            createdAt: '2026-07-24T00:00:00.000Z',
            roles: listedRoles
          }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
        },
        response
      }
    })
  })

  it('renders a protected selected role by name instead of its raw ID', async () => {
    const wrapper = mountView()
    await flushPromises()

    const roleSelect = wrapper.get('[aria-label="Roles for root@example.com"]')
    expect(roleSelect.text()).toContain('Super Admin')
    expect(roleSelect.attributes('disabled')).toBeDefined()
  })

  it('disables the sole selected role but allows adding another assignable role', async () => {
    listedRoles = [{ id: standardUser.id, name: standardUser.name, slug: standardUser.slug }]
    const wrapper = mountView()
    await flushPromises()

    const roleSelect = getRoleSelect(wrapper)
    expect(roleSelect.attributes('disabled')).toBeUndefined()
    const items = (roleSelect.props() as { items: unknown[] }).items
    expect(items).toEqual([
      expect.objectContaining({ value: superAdmin.id, disabled: true }),
      expect.objectContaining({ value: admin.id, disabled: false }),
      expect.objectContaining({ value: standardUser.id, disabled: true })
    ])
  })

  it('does not submit an empty selection and submits add and remove changes', async () => {
    listedRoles = [{ id: standardUser.id, name: standardUser.name, slug: standardUser.slug }]
    const wrapper = mountView()
    await flushPromises()
    const roleSelect = getRoleSelect(wrapper)

    roleSelect.vm.$emit('update:modelValue', [])
    await flushPromises()
    expect(api.PUT).not.toHaveBeenCalled()

    roleSelect.vm.$emit('update:modelValue', [standardUser.id, admin.id])
    await flushPromises()
    expect(api.PUT).toHaveBeenLastCalledWith('/api/v1/users/{userId}/roles', {
      params: { path: { userId: listedUserId } },
      body: { roleIds: [standardUser.id, admin.id] }
    })

    roleSelect.vm.$emit('update:modelValue', [admin.id])
    await flushPromises()
    expect(api.PUT).toHaveBeenLastCalledWith('/api/v1/users/{userId}/roles', {
      params: { path: { userId: listedUserId } },
      body: { roleIds: [admin.id] }
    })
    expect(api.PUT).toHaveBeenCalledTimes(2)
  })

  it('shows role replacement failures', async () => {
    listedRoles = [{ id: standardUser.id, name: standardUser.name, slug: standardUser.slug }]
    api.PUT.mockResolvedValue({ response: { ok: false, status: 409 } })
    const wrapper = mountView()
    await flushPromises()

    const roleSelect = getRoleSelect(wrapper)
    roleSelect.vm.$emit('update:modelValue', [standardUser.id, admin.id])
    await flushPromises()

    expect(wrapper.text()).toContain('API request failed with HTTP 409')
  })
})
