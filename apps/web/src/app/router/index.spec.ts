import { PiniaColada, useQueryCache } from '@pinia/colada'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import { SESSION_KEY } from '@/features/auth'
import router from './index'

const api = vi.hoisted(() => ({ GET: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ api }))

const sessionUser = {
  id: '1',
  email: 'person@example.com',
  role: 'user' as const,
  profile: { firstName: null, lastName: null, gender: null, birthDate: null, bio: null, createdAt: '', updatedAt: '' },
  createdAt: '',
  updatedAt: ''
}

// Single test: vue-router runs guards inside the context of the first app it
// was installed on, so a second createApp/createPinia pair never reaches the guard.
describe('authentication router guard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks the session for protected routes and gates role-protected routes', async () => {
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
    cache.setQueryData(SESSION_KEY, sessionUser)
    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/profile')

    await router.push('/tasks')
    expect(router.currentRoute.value.fullPath).toBe('/tasks')

    // a standard user is bounced home from role-protected routes
    await router.push('/admin/users')
    expect(router.currentRoute.value.fullPath).toBe('/')

    cache.setQueryData(SESSION_KEY, { ...sessionUser, role: 'admin' as const })
    await router.push('/admin/users')
    expect(router.currentRoute.value.fullPath).toBe('/admin/users')

    await router.push('/')
    cache.setQueryData(SESSION_KEY, { ...sessionUser, role: 'super_admin' as const })
    await router.push('/admin/users')
    expect(router.currentRoute.value.fullPath).toBe('/admin/users')

    await router.push('/register')
    await cache.invalidateQueries({ key: SESSION_KEY })
    api.GET.mockResolvedValue({ response: { ok: false, status: 503 } })
    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/profile')
  })
})
