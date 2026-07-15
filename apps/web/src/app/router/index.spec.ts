import { PiniaColada, useQueryCache } from '@pinia/colada'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import { AUTHORIZATION_KEY } from '@/features/permissions'
import router from './index'

const api = vi.hoisted(() => ({ GET: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ api }))

describe('authentication router guard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks the session only for protected routes', async () => {
    api.GET.mockResolvedValue({ response: { ok: false, status: 401 } })
    const app = createApp({ template: '<div />' })
    const pinia = createPinia()
    app.use(pinia)
    app.use(PiniaColada)
    app.use(router)
    await router.isReady()

    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/profile')

    await router.push('/tasks')
    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/tasks')

    await router.push('/register')
    expect(router.currentRoute.value.fullPath).toBe('/register')
    expect(api.GET).toHaveBeenCalledOnce()

    const cache = useQueryCache(pinia)
    cache.setQueryData(AUTHORIZATION_KEY, {
      user: { id: '00000000-0000-0000-0000-000000000001', email: 'person@example.com' },
      roles: [],
      permissions: [],
      authorizationVersion: 1
    })
    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/profile')

    await router.push('/tasks')
    expect(router.currentRoute.value.fullPath).toBe('/tasks')

    await router.push('/register')
    await cache.invalidateQueries({ key: AUTHORIZATION_KEY })
    api.GET.mockResolvedValue({ response: { ok: false, status: 503 } })
    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/profile')
  })
})
