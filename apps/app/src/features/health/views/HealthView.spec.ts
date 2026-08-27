import { RpcError } from '@monorepo-fastify-vue/api-client'
import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HealthView from './HealthView.vue'

const { get } = vi.hoisted(() => ({
  get: vi.fn()
}))

vi.mock('@/shared/api/client', () => ({
  api: {
    GET: get
  }
}))

describe('healthView', () => {
  beforeEach(() => {
    get.mockReset()
  })

  function mountHealthView() {
    return mount(HealthView, {
      global: {
        plugins: [
          createPinia(),
          [PiniaColada, { queryOptions: { staleTime: 0 } }]
        ]
      }
    })
  }

  it('shows live health status', async () => {
    get.mockResolvedValue({ data: { status: 'ok' }, response: { ok: true } })

    const wrapper = mountHealthView()
    await flushPromises()

    expect(get).toHaveBeenCalledWith('/api/v1/health/live')
    expect(wrapper.text()).toContain('ok')
  })

  it('shows an error when the health check fails', async () => {
    get.mockRejectedValue(new Error('down'))

    const wrapper = mountHealthView()
    await flushPromises()

    expect(wrapper.text()).toContain('unavailable')
    expect(wrapper.text()).toContain('Health check failed')
  })

  it('includes the HTTP status when the health check fails with an RpcError', async () => {
    get.mockRejectedValue(new RpcError(503))

    const wrapper = mountHealthView()
    await flushPromises()

    expect(wrapper.text()).toContain('unavailable')
    expect(wrapper.text()).toContain('Health check failed (HTTP 503)')
  })

  it('prefers the error state over stale data after a failed refetch', async () => {
    get.mockResolvedValueOnce({ data: { status: 'ok' }, response: { ok: true } })
    get.mockRejectedValueOnce(new Error('down'))

    const wrapper = mountHealthView()
    await flushPromises()
    expect(wrapper.text()).toContain('ok')

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('unavailable')
    expect(wrapper.text()).toContain('Health check failed')
  })
})
