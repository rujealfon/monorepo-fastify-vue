import type { Router } from 'vue-router'

import { PiniaColada, useQueryCache } from '@pinia/colada'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import { SESSION_KEY } from '@/features/auth'

const api = vi.hoisted(() => ({ GET: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ api }))

describe('authentication router guard', () => {
  let router: Router

  beforeEach(async () => {
    vi.clearAllMocks()
    // The router is a module singleton whose guard resolves the query cache
    // from the app it was first installed into — re-import it per test so
    // each test gets a router bound to its own pinia instance.
    vi.resetModules()
    router = (await import('./index')).default
  })

  function setup() {
    const app = createApp({ template: '<div />' })
    const pinia = createPinia()
    app.use(pinia)
    app.use(PiniaColada)
    app.use(router)
    return pinia
  }

  it('checks the session only for protected routes', async () => {
    api.GET.mockResolvedValue({ response: { ok: false, status: 401 } })
    const pinia = setup()
    await router.isReady()

    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/profile')

    await router.push('/tasks')
    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/tasks')

    await router.push('/register')
    expect(router.currentRoute.value.fullPath).toBe('/register')
    expect(api.GET).toHaveBeenCalledOnce()

    const cache = useQueryCache(pinia)
    cache.setQueryData(SESSION_KEY, {
      id: '1',
      email: 'person@example.com',
      role: { id: 'role-user', slug: 'user', name: 'Standard User', rank: 10 },
      permissions: [],
      profile: { firstName: null, lastName: null, gender: null, birthDate: null, bio: null, createdAt: '', updatedAt: '' },
      createdAt: '',
      updatedAt: ''
    })
    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/profile')

    await router.push('/tasks')
    expect(router.currentRoute.value.fullPath).toBe('/tasks')

    await router.push('/register')
    await cache.invalidateQueries({ key: SESSION_KEY })
    api.GET.mockResolvedValue({ response: { ok: false, status: 503 } })
    await router.push('/profile')
    expect(router.currentRoute.value.fullPath).toBe('/profile')
  })

  it('gates ability-protected routes on the session permissions', async () => {
    const user = {
      id: '1',
      email: 'person@example.com',
      role: { id: 'role-user', slug: 'user', name: 'Standard User', rank: 10 },
      permissions: [] as Array<{ action: string, subject: string, conditions: null }>,
      profile: { firstName: null, lastName: null, gender: null, birthDate: null, bio: null, createdAt: '', updatedAt: '' },
      createdAt: '',
      updatedAt: ''
    }
    api.GET.mockResolvedValue({ data: user, response: { ok: true, status: 200 } })
    const pinia = setup()
    await router.isReady()

    await router.push('/admin/users')
    expect(router.currentRoute.value.fullPath).toBe('/')

    const cache = useQueryCache(pinia)
    cache.setQueryData(SESSION_KEY, { ...user, permissions: [{ action: 'read', subject: 'User', conditions: null }] })
    await router.push('/admin/users')
    expect(router.currentRoute.value.fullPath).toBe('/admin/users')
  })
})
