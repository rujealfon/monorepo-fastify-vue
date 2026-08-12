import { PiniaColada, useQueryCache } from '@pinia/colada'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import { SESSION_KEY } from '@/features/session'
import router from './index'

const sessionClient = vi.hoisted(() => ({ currentUser: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ sessionClient }))

describe('authentication router guard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks the session only for protected and guest-only routes', async () => {
    sessionClient.currentUser.mockResolvedValue(null)
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
    expect(sessionClient.currentUser).toHaveBeenCalledOnce()

    const cache = useQueryCache(pinia)
    cache.setQueryData(SESSION_KEY, {
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
    await cache.invalidateQueries({ key: SESSION_KEY })
    sessionClient.currentUser.mockRejectedValue(new Error('Unavailable'))
    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/profile')
  })
})
