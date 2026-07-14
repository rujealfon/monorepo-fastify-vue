import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AdminRolesView from './AdminRolesView.vue'

const api = vi.hoisted(() => ({
  DELETE: vi.fn(),
  GET: vi.fn(),
  PATCH: vi.fn(),
  POST: vi.fn()
}))

vi.mock('@/shared/api/client', () => ({ api }))

const response = { ok: true, status: 200 }

const sessionUser = {
  id: 'super-id',
  email: 'super@example.com',
  role: { id: 'role-super', name: 'super_admin', isSystem: true },
  permissions: ['users:read', 'users:manage', 'roles:read', 'roles:manage'],
  profile: { firstName: null, lastName: null, gender: null, birthDate: null, bio: null, createdAt: '', updatedAt: '' },
  createdAt: '',
  updatedAt: ''
}

const rolesList = {
  data: [
    { id: 'role-user', name: 'user', isSystem: true, description: 'Standard user', permissions: [], userCount: 4, createdAt: '', updatedAt: '' },
    { id: 'role-super', name: 'super_admin', isSystem: true, description: null, permissions: ['users:read', 'users:manage', 'roles:read', 'roles:manage'], userCount: 1, createdAt: '', updatedAt: '' },
    { id: 'role-support', name: 'support', isSystem: false, description: 'Read only', permissions: ['users:read'], userCount: 0, createdAt: '', updatedAt: '' }
  ]
}

const catalog = {
  data: [
    { group: 'Users', permissions: [
      { value: 'users:read', label: 'View users', description: 'List user accounts' },
      { value: 'users:manage', label: 'Manage users', description: 'Assign roles and delete accounts' }
    ] },
    { group: 'Roles', permissions: [
      { value: 'roles:read', label: 'View roles', description: 'List roles' },
      { value: 'roles:manage', label: 'Manage roles', description: 'Create, edit and delete roles' }
    ] }
  ]
}

function mountView() {
  return mount(AdminRolesView, {
    global: { plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]] }
  })
}

describe('adminRolesView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    api.GET.mockImplementation(async (url: string) => {
      if (url === '/api/v1/profile/')
        return { data: sessionUser, response }
      if (url === '/api/v1/admin/permissions/')
        return { data: catalog, response }
      return { data: rolesList, response }
    })
    api.POST.mockResolvedValue({ response: { ok: true, status: 201 } })
    api.PATCH.mockResolvedValue({ response })
    api.DELETE.mockResolvedValue({ response: { ok: true, status: 204 } })
  })

  it('lists roles with badges and gates controls', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('super_admin')
    expect(wrapper.text()).toContain('support')
    expect(wrapper.text()).toContain('System')
    expect(wrapper.text()).toContain('4 users')

    // system roles have no delete button; custom roles do
    expect(wrapper.find('[aria-label="Delete user"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Delete support"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Edit support"]').exists()).toBe(true)
  })

  it('creates a role with selected permissions', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('button[type="button"]').trigger('click')
    const buttons = wrapper.findAll('button').filter(button => button.text().includes('New role'))
    if (buttons.length)
      await buttons[0].trigger('click')
    await flushPromises()

    const nameInput = document.body.querySelector<HTMLInputElement>('input[name="role-name"]')
    expect(nameInput).toBeTruthy()
    nameInput!.value = 'support-2'
    nameInput!.dispatchEvent(new Event('input', { bubbles: true }))

    const checkbox = [...document.body.querySelectorAll('button[role="checkbox"]')][0] as HTMLButtonElement
    checkbox.click()
    await flushPromises()

    const form = document.body.querySelector('#role-form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()

    expect(api.POST).toHaveBeenCalledWith('/api/v1/admin/roles/', {
      body: { name: 'support-2', description: null, permissions: ['users:read'] }
    })
  })

  it('deletes a custom role after confirmation', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('[aria-label="Delete support"]').trigger('click')
    await flushPromises()

    const confirm = [...document.body.querySelectorAll('button')]
      .find(button => button.textContent?.trim() === 'Delete')
    expect(confirm).toBeDefined()
    confirm!.click()
    await flushPromises()

    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/admin/roles/{id}', { params: { path: { id: 'role-support' } } })
  })

  it('shows query failures', async () => {
    api.GET.mockImplementation(async (url: string) => {
      if (url === '/api/v1/profile/')
        return { data: sessionUser, response }
      return { response: { ok: false, status: 503 } }
    })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('API request failed with HTTP 503')
  })
})
