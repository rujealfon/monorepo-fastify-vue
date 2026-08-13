import { PiniaColada } from '@pinia/colada'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { checkSessionAccess, currentUserQuery } from './session.query'

const sessionClient = vi.hoisted(() => ({ currentUser: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ sessionClient }))

describe('current User query', () => {
  beforeEach(() => vi.clearAllMocks())

  it('delegates Session semantics to the shared client', async () => {
    const user = { id: '1', email: 'person@example.com' }
    sessionClient.currentUser.mockResolvedValue(user)

    await expect(currentUserQuery.query({} as never)).resolves.toEqual(user)
    expect(sessionClient.currentUser).toHaveBeenCalledOnce()
  })

  it('reports an unavailable Session check without translating it to guest', async () => {
    sessionClient.currentUser.mockRejectedValue(new Error('Unavailable'))
    const Host = defineComponent({ setup: () => () => h('div') })
    const wrapper = mount(Host, { global: { plugins: [createPinia(), PiniaColada] } })

    await expect(checkSessionAccess()).resolves.toMatchObject({ status: 'unavailable' })
    wrapper.unmount()
  })
})
