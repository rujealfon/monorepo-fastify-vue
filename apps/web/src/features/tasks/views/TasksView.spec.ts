import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TasksView from './TasksView.vue'

const api = vi.hoisted(() => ({
  DELETE: vi.fn(),
  GET: vi.fn(),
  PATCH: vi.fn(),
  POST: vi.fn()
}))

vi.mock('@/shared/api/client', () => ({ api }))

describe('tasksView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const response = { ok: true, status: 200 }
    api.GET.mockImplementation(async (url: string) => url === '/api/v1/me/authorization'
      ? {
          data: {
            user: { id: '00000000-0000-0000-0000-000000000001', email: 'person@example.com' },
            roles: [],
            rules: [{ action: 'manage', subject: 'Task' }],
            authorizationVersion: 1
          },
          response
        }
      : {
          data: {
            data: [{ id: 1, userId: '00000000-0000-0000-0000-000000000001', name: 'Ship CRUD', done: false, createdAt: '', updatedAt: '' }],
            pagination: { page: 1, limit: 20, total: 21, totalPages: 2 }
          },
          response
        })
    api.POST.mockResolvedValue({ response })
    api.PATCH.mockResolvedValue({ response })
    api.DELETE.mockResolvedValue({ response })
  })

  it('lists, creates, updates and deletes tasks', async () => {
    const wrapper = mount(TasksView, {
      global: { plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Ship CRUD')
    expect(api.GET).toHaveBeenCalledWith('/api/v1/tasks/', { params: { query: { page: 1, limit: 20 } } })
    expect(wrapper.get('nav button:first-child').attributes('disabled')).toBeDefined()

    api.GET.mockResolvedValueOnce({
      data: {
        data: [{ id: 1, name: 'Ship CRUD', done: false, createdAt: '', updatedAt: '' }],
        pagination: { page: 2, limit: 20, total: 21, totalPages: 2 }
      },
      response: { ok: true, status: 200 }
    })
    await wrapper.get('nav button:last-child').trigger('click')
    await flushPromises()
    expect(api.GET).toHaveBeenCalledWith('/api/v1/tasks/', { params: { query: { page: 2, limit: 20 } } })
    expect(wrapper.get('nav button:last-child').attributes('disabled')).toBeDefined()

    await wrapper.get('#task-name').setValue('New task')
    const readsBeforeCreate = api.GET.mock.calls.length
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.POST).toHaveBeenCalledWith('/api/v1/tasks/', { body: { name: 'New task' } })
    expect(api.GET.mock.calls.length).toBeGreaterThan(readsBeforeCreate)

    await wrapper.get('button[role="checkbox"]').trigger('click')
    await flushPromises()
    expect(api.PATCH).toHaveBeenCalledWith('/api/v1/tasks/{id}', {
      params: { path: { id: 1 } },
      body: { done: true }
    })

    await wrapper.get('li button[aria-label^="Delete"]').trigger('click')
    await flushPromises()
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/tasks/{id}', {
      params: { path: { id: 1 } }
    })
  })

  it('shows query failures', async () => {
    api.GET.mockImplementation(async (url: string) => url === '/api/v1/me/authorization'
      ? {
          data: { user: { id: '00000000-0000-0000-0000-000000000001', email: 'person@example.com' }, roles: [], rules: [{ action: 'manage', subject: 'Task' }], authorizationVersion: 1 },
          response: { ok: true, status: 200 }
        }
      : { response: { ok: false, status: 503 } })
    const wrapper = mount(TasksView, {
      global: { plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]] }
    })
    await flushPromises()
    expect(wrapper.text()).toContain('API request failed with HTTP 503')
  })

  it('shows mutation failures', async () => {
    api.POST.mockResolvedValue({ response: { ok: false, status: 500 } })
    const wrapper = mount(TasksView, {
      global: { plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]] }
    })
    await flushPromises()
    await wrapper.get('#task-name').setValue('Fails')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('API request failed with HTTP 500')
  })

  it.each([
    ['PATCH', 'button[role="checkbox"]'],
    ['DELETE', 'li button[aria-label^="Delete"]']
  ] as const)('shows %s failures', async (method, selector) => {
    api[method].mockResolvedValue({ response: { ok: false, status: 500 } })
    const wrapper = mount(TasksView, {
      global: { plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]] }
    })
    await flushPromises()
    await wrapper.get(selector).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('API request failed with HTTP 500')
  })
})
