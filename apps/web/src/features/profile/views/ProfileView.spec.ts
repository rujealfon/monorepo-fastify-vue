import { PiniaColada, useQueryCache } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { sessionQuery } from '@/features/auth'
import ProfileView from './ProfileView.vue'

const api = vi.hoisted(() => ({ GET: vi.fn(), PATCH: vi.fn(), POST: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ api }))

describe('profile view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const response = { ok: true, status: 200 }
    const profile = { firstName: 'Person', lastName: null, sex: null, birthDate: null, bio: null, createdAt: '', updatedAt: '' }
    api.GET.mockResolvedValue({ data: { id: '1', email: 'person@example.com', profile, createdAt: '', updatedAt: '' }, response })
    api.PATCH.mockResolvedValue({ data: { id: '1', email: 'person@example.com', profile: { ...profile, firstName: 'Updated' }, createdAt: '', updatedAt: '' }, response })
    api.POST.mockResolvedValue({ response: { ok: true, status: 204 } })
  })

  it('updates the profile and logs out', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/profile', component: ProfileView },
        { path: '/login', component: { template: '<p>Login</p>' } }
      ]
    })
    await router.push('/profile')
    const pinia = createPinia()
    const wrapper = mount(ProfileView, { global: { plugins: [pinia, PiniaColada, router] } })
    await flushPromises()

    await wrapper.get('#profile-first-name').setValue('Updated')
    await wrapper.get('#profile-last-name').setValue('Person')
    await wrapper.get('#profile-sex').setValue('prefer_not_to_say')
    await wrapper.get('#profile-birth-date').setValue('1990-05-20')
    await wrapper.get('#profile-bio').setValue('Hello')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.PATCH).toHaveBeenCalledWith('/api/v1/profile/', {
      body: {
        firstName: 'Updated',
        lastName: 'Person',
        sex: 'prefer_not_to_say',
        birthDate: '1990-05-20',
        bio: 'Hello'
      }
    })
    expect(useQueryCache(pinia).getQueryData(sessionQuery.key)?.profile.firstName).toBe('Updated')

    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(api.POST).toHaveBeenCalledWith('/api/v1/auth/logout')
    expect(router.currentRoute.value.fullPath).toBe('/login')
    expect(useQueryCache(pinia).getQueryData(sessionQuery.key)).toBeNull()
  })

  it('shows update and logout failures without redirecting', async () => {
    api.PATCH.mockResolvedValue({ response: { ok: false, status: 500 } })
    api.POST.mockResolvedValue({ response: { ok: false, status: 500 } })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/profile', component: ProfileView },
        { path: '/login', component: { template: '<p>Login</p>' } }
      ]
    })
    await router.push('/profile')
    const wrapper = mount(ProfileView, { global: { plugins: [createPinia(), PiniaColada, router] } })
    await flushPromises()

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Could not update')

    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Could not log out')
    expect(router.currentRoute.value.fullPath).toBe('/profile')
  })
})
