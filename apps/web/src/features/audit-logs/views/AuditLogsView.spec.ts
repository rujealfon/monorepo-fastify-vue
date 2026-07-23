import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AuditLogsView from './AuditLogsView.vue'

const api = vi.hoisted(() => ({
  GET: vi.fn()
}))

vi.mock('@/shared/api/client', () => ({ api }))

const sampleLog = {
  id: '1',
  actorId: 'a3f1c2d4-5b6e-4a7f-8c9d-0e1f2a3b4c5d',
  actorEmail: 'admin@example.com',
  action: 'task.created',
  entityType: 'task',
  entityId: '7',
  metadata: { name: 'audited task' },
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  requestId: 'req-1',
  createdAt: '2026-07-15T10:00:00.000Z'
}

const authorizationResponse = {
  data: {
    user: { id: 'a3f1c2d4-5b6e-4a7f-8c9d-0e1f2a3b4c5d', email: 'admin@example.com' },
    roles: [],
    rules: [
      { action: 'read', subject: 'audit' },
      { action: 'read', subject: 'roles' }
    ],
    authorizationVersion: 1
  },
  response: { ok: true, status: 200 }
}

function mockAuditPage(data: unknown[], pagination = { page: 1, limit: 20, total: data.length, totalPages: data.length ? 1 : 0 }) {
  api.GET.mockImplementation(async (url: string) => url === '/api/v1/me/authorization'
    ? authorizationResponse
    : { data: { data, pagination }, response: { ok: true, status: 200 } })
}

function mountView() {
  return mount(AuditLogsView, {
    global: {
      plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]],
      stubs: { RouterLink: RouterLinkStub }
    }
  })
}

describe('auditLogsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuditPage([sampleLog])
  })

  it('lists audit events with actor, entity, request context and metadata', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(api.GET).toHaveBeenCalledWith('/api/v1/audit-logs/', { params: { query: { page: 1, limit: 20 } } })
    expect(wrapper.text()).toContain('Task created')
    expect(wrapper.text()).toContain('admin@example.com')
    expect(wrapper.text()).toContain('task #7')
    expect(wrapper.text()).toContain('127.0.0.1')
    expect(wrapper.text()).toContain('req req-1')
    expect(wrapper.get('details pre').text()).toContain('audited task')
  })

  it('links role entities to the role detail page', async () => {
    mockAuditPage([{ ...sampleLog, action: 'role.updated', entityType: 'role', entityId: '3' }])
    const wrapper = mountView()
    await flushPromises()

    const link = wrapper.getComponent(RouterLinkStub)
    expect(link.props('to')).toBe('/admin/roles/3')
    expect(link.text()).toContain('role #3')
  })

  it('labels events from deleted users', async () => {
    mockAuditPage([{ ...sampleLog, actorId: null, actorEmail: null, metadata: null }])
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Deleted user')
    expect(wrapper.find('details').exists()).toBe(false)
  })

  it('resets the page and passes the actor email filter', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('input[aria-label="Filter by actor email"]').setValue('admin@')
    await flushPromises()

    expect(api.GET).toHaveBeenCalledWith('/api/v1/audit-logs/', {
      params: { query: { page: 1, limit: 20, actorEmail: 'admin@' } }
    })
  })

  it('passes the date range as ISO datetimes', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('input[aria-label="From date"]').setValue('2026-07-01')
    await wrapper.get('input[aria-label="To date"]').setValue('2026-07-15')
    await flushPromises()

    expect(api.GET).toHaveBeenCalledWith('/api/v1/audit-logs/', {
      params: { query: { page: 1, limit: 20, from: '2026-07-01T00:00:00.000Z', to: '2026-07-15T23:59:59.999Z' } }
    })
  })

  it('shows the empty state', async () => {
    mockAuditPage([])
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('No audit events')
  })

  it('shows query failures', async () => {
    api.GET.mockImplementation(async (url: string) => url === '/api/v1/me/authorization'
      ? authorizationResponse
      : { response: { ok: false, status: 503 } })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('API request failed with HTTP 503')
  })
})
