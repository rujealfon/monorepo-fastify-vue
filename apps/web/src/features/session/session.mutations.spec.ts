import type { User } from '@monorepo-fastify-vue/api-client'

import { PiniaColada, useQueryCache } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { useLogin, useLogout, useUpdateProfile } from './session.mutations'
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
    login: ReturnType<typeof useLogin>
    logout: ReturnType<typeof useLogout>
    updateProfile: ReturnType<typeof useUpdateProfile>
  }
  const Host = defineComponent({
    setup() {
      mutations = { login: useLogin(), logout: useLogout(), updateProfile: useUpdateProfile() }
      return () => h('div')
    }
  })
  const wrapper = mount(Host, { global: { plugins: [pinia, PiniaColada] } })
  return { cache: useQueryCache(pinia), mutations, wrapper }
}

describe('session mutations', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionClient.login.mockResolvedValue(newUser)
    sessionClient.logout.mockResolvedValue(undefined)
    sessionClient.updateProfile.mockResolvedValue(newUser)
  })

  it('cancels the exact current-User query before every identity-changing mutation', async () => {
    const { cache, mutations, wrapper } = mountMutations()
    const cancel = vi.spyOn(cache, 'cancelQueries')

    await mutations.login.mutateAsync({ email: 'new@example.com', password: 'correct horse battery staple' })
    await mutations.logout.mutateAsync()
    await mutations.updateProfile.mutateAsync({ firstName: 'New' })

    expect(cancel).toHaveBeenCalledTimes(3)
    expect(cancel).toHaveBeenNthCalledWith(1, { key: SESSION_KEY, exact: true })
    expect(cancel).toHaveBeenNthCalledWith(2, { key: SESSION_KEY, exact: true })
    expect(cancel).toHaveBeenNthCalledWith(3, { key: SESSION_KEY, exact: true })
    wrapper.unmount()
  })

  it('does not let a stale current-User response overwrite logout', async () => {
    const currentUser = deferred<User | null>()
    sessionClient.currentUser.mockReturnValue(currentUser.promise)
    const { cache, mutations, wrapper } = mountMutations()
    const refresh = cache.refresh(cache.ensure(currentUserQuery)).catch(() => undefined)
    await flushPromises()

    await mutations.logout.mutateAsync()
    currentUser.resolve(oldUser)
    await refresh
    await flushPromises()

    expect(cache.getQueryData(SESSION_KEY)).toBeNull()
    wrapper.unmount()
  })
})
