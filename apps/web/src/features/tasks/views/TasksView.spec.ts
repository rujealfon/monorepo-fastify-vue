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
    api.GET.mockResolvedValue({
      data: {
        data: [{ id: 1, name: 'Ship CRUD', done: false, createdAt: '', updatedAt: '' }],
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

    await wrapper.get('#task-name').setValue('New task')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.POST).toHaveBeenCalledWith('/api/v1/tasks/', { body: { name: 'New task' } })

    await wrapper.get('input[type="checkbox"]').trigger('change')
    await flushPromises()
    expect(api.PATCH).toHaveBeenCalledWith('/api/v1/tasks/{id}', {
      params: { path: { id: 1 } },
      body: { done: true }
    })

    await wrapper.get('li button').trigger('click')
    await flushPromises()
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/tasks/{id}', {
      params: { path: { id: 1 } }
    })
  })
})
