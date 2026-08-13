import type { User } from '@monorepo-fastify-vue/api-client'

import { PiniaColada, useQueryCache } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { useSessionActions } from './session.mutations'
import { currentUserQuery, SESSION_KEY } from './session.query'

const sessionClient = vi.hoisted(() => ({
  currentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn()
}))
vi.mock('@/shared/api/client', () => ({ sessionClient }))

const oldUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'old@example.com',
  profile: { firstName: 'Old', lastName: null, gender: null, birthDate: null, bio: null, createdAt: '', updatedAt: '' },
  createdAt: '',
  updatedAt: ''
} satisfies User

const newUser = {
  ...oldUser,
  email: 'new@example.com',
  profile: { ...oldUser.profile, firstName: 'New' }
} satisfies User

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function mountMutations() {
  const pinia = createPinia()
  let mutations!: {
    login: ReturnType<typeof useSessionActions>['login']
    logout: ReturnType<typeof useSessionActions>['logout']
    updateProfile: ReturnType<typeof useSessionActions>['updateProfile']
  }
  const Host = defineComponent({
    setup() {
      const { login, logout, updateProfile } = useSessionActions()
      mutations = { login, logout, updateProfile }
      return () => h('div')
    }
  })
  const wrapper = mount(Host, { global: { plugins: [pinia, PiniaColada] } })
  return { cache: useQueryCache(pinia), mutations, wrapper }
}

describe('session mutations', () => {
  let wrapper: ReturnType<typeof mountMutations>['wrapper'] | undefined

  beforeEach(() => {
    vi.resetAllMocks()
    sessionClient.login.mockResolvedValue(newUser)
    sessionClient.logout.mockResolvedValue(undefined)
    sessionClient.updateProfile.mockResolvedValue(newUser)
  })

  afterEach(() => wrapper?.unmount())

  it('cancels the exact current-User query before every identity-changing mutation, and writes each result to the cache', async () => {
    const mounted = mountMutations()
    wrapper = mounted.wrapper
    const { cache, mutations } = mounted
    const cancel = vi.spyOn(cache, 'cancelQueries')

    await mutations.login.mutateAsync({ email: 'new@example.com', password: 'correct horse battery staple' })
    expect(cache.getQueryData(SESSION_KEY)).toEqual(newUser)

    await mutations.logout.mutateAsync()
    expect(cache.getQueryData(SESSION_KEY)).toBeNull()

    await mutations.updateProfile.mutateAsync({ firstName: 'New' })
    expect(cache.getQueryData(SESSION_KEY)).toEqual(newUser)

    expect(cancel).toHaveBeenCalledTimes(3)
    expect(cancel).toHaveBeenNthCalledWith(1, { key: SESSION_KEY, exact: true })
    expect(cancel).toHaveBeenNthCalledWith(2, { key: SESSION_KEY, exact: true })
    expect(cancel).toHaveBeenNthCalledWith(3, { key: SESSION_KEY, exact: true })
  })

  it('does not let a stale current-User response overwrite logout', async () => {
    const currentUser = deferred<User | null>()
    sessionClient.currentUser.mockReturnValue(currentUser.promise)
    const mounted = mountMutations()
    wrapper = mounted.wrapper
    const { cache, mutations } = mounted
    const refresh = cache.refresh(cache.ensure(currentUserQuery)).catch(() => undefined)
    await flushPromises()

    await mutations.logout.mutateAsync()
    currentUser.resolve(oldUser)
    await refresh
    await flushPromises()

    expect(cache.getQueryData(SESSION_KEY)).toBeNull()
  })
})
