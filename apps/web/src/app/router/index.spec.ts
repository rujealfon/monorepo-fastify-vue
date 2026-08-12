import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import router from './index'

const checkSessionAccess = vi.hoisted(() => vi.fn())
vi.mock('@/features/session', () => ({ checkSessionAccess }))

describe('authentication router guard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks the session only for protected and guest-only routes', async () => {
    checkSessionAccess.mockResolvedValue({ status: 'guest', user: null })
    const app = createApp({ template: '<div />' })
    app.use(router)
    await router.isReady()

    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/profile')

    await router.push('/register')
    expect(router.currentRoute.value.fullPath).toBe('/register')
    expect(checkSessionAccess).toHaveBeenCalled()

    checkSessionAccess.mockResolvedValue({ status: 'authenticated', user: { email: 'person@example.com' } })
    await router.push('/health')
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
    checkSessionAccess.mockResolvedValue({ status: 'unavailable', error: new Error('Unavailable') })
    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/health')
  })
})
