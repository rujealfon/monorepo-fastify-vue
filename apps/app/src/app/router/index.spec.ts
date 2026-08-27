import { PiniaColada, useQueryCache } from '@pinia/colada'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import { PROFILE_KEY } from '@/features/profile'
import router from './index'

const api = vi.hoisted(() => ({ GET: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ api }))

describe('authentication router guard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks the session only for protected and guest-only routes', async () => {
    api.GET.mockResolvedValue({ response: { ok: false, status: 401 } })
    const app = createApp({ template: '<div />' })
    const pinia = createPinia()
    app.use(pinia)
    app.use(PiniaColada)
    app.use(router)
    await router.isReady()

    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/profile')

    await router.push('/register')
    expect(router.currentRoute.value.fullPath).toBe('/register')
    expect(api.GET).toHaveBeenCalledOnce()

    const cache = useQueryCache(pinia)
    cache.setQueryData(PROFILE_KEY, {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'person@example.com'
    })
    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/profile')

    // Signed-in users shouldn't be able to reach login/register: both bounce
    // back to /profile instead of showing the form.
    await router.push('/health')
    await router.push('/login')
    expect(router.currentRoute.value.fullPath).toBe('/profile')

    await router.push('/health')
    await router.push('/register')
    expect(router.currentRoute.value.fullPath).toBe('/profile')

    await router.push('/health')
    await cache.invalidateQueries({ key: PROFILE_KEY })
    api.GET.mockResolvedValue({ response: { ok: false, status: 503 } })
    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/profile')
  })
})
