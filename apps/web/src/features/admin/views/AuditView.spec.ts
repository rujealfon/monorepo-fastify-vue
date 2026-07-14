import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AuditView from './AuditView.vue'

const api = vi.hoisted(() => ({ GET: vi.fn() }))
vi.mock('@/shared/api/client', async importOriginal => ({
  ...await importOriginal<typeof import('@/shared/api/client')>(),
  api
}))

const event = {
  id: '11111111-1111-4111-8111-111111111111',
  actorId: '22222222-2222-4222-8222-222222222222',
  actorEmail: 'member@example.com',
  eventType: 'authorization.decision',
  outcome: 'deny',
  permission: 'tasks.delete',
  resourceType: 'task',
  resourceId: '7',
  matchedAllowPolicyIds: [],
  matchedDenyPolicyIds: ['33333333-3333-4333-8333-333333333333'],
  details: { reason: 'policy' },
  createdAt: '2026-07-14T00:00:00.000Z'
}

describe('audit view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.GET.mockResolvedValue({
      data: { data: [event], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      response: { ok: true, status: 200 }
    })
  })

  it('applies filters and opens read-only event details', async () => {
    const wrapper = mount(AuditView, {
      attachTo: document.body,
      global: { plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }]] }
    })
    await flushPromises()
    expect(wrapper.text()).toContain('member@example.com')
    expect(api.GET).toHaveBeenCalledWith('/api/v1/admin/audit-events', { params: { query: { page: 1, limit: 20 } } })

    await wrapper.get('input[placeholder="Email or UUID"]').setValue('member@example.com')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.GET).toHaveBeenLastCalledWith('/api/v1/admin/audit-events', {
      params: { query: { page: 1, limit: 20, actor: 'member@example.com' } }
    })

    await wrapper.findAll('button').find(button => button.text().includes('Details'))!.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('33333333-3333-4333-8333-333333333333')
    expect(document.body.textContent).toContain('"reason": "policy"')
    wrapper.unmount()
  })
})
