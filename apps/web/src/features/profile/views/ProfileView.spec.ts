import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

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
    const wrapper = mount(ProfileView, { global: { plugins: [createPinia(), PiniaColada, router] } })
    await flushPromises()

    await wrapper.get('#profile-first-name').setValue('Updated')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.PATCH).toHaveBeenCalledWith('/api/v1/profile/', {
      body: { firstName: 'Updated', lastName: null, sex: null, birthDate: null, bio: null }
    })

    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(api.POST).toHaveBeenCalledWith('/api/v1/auth/logout')
    expect(router.currentRoute.value.fullPath).toBe('/login')
  })
})
