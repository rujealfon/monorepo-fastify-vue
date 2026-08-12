import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import ProfileView from './ProfileView.vue'

const sessionClient = vi.hoisted(() => ({ currentUser: vi.fn(), logout: vi.fn(), updateProfile: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ sessionClient }))

const USelectStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<select data-testid="gender" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="prefer_not_to_say">Prefer not to say</option></select>'
}

describe('profile view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const profile = { firstName: 'Person', lastName: null, gender: null, birthDate: null, bio: null, createdAt: '', updatedAt: '' }
    sessionClient.currentUser.mockResolvedValue({ id: '1', email: 'person@example.com', profile, createdAt: '', updatedAt: '' })
    sessionClient.updateProfile.mockResolvedValue({ id: '1', email: 'person@example.com', profile: { ...profile, firstName: 'Updated' }, createdAt: '', updatedAt: '' })
    sessionClient.logout.mockResolvedValue(undefined)
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
    const wrapper = mount(ProfileView, { global: { plugins: [pinia, PiniaColada, router], stubs: { Select: USelectStub } } })
    await flushPromises()

    await wrapper.get('input[name="firstName"]').setValue('Updated')
    await wrapper.get('input[name="lastName"]').setValue('Person')
    await wrapper.get('[data-testid="gender"]').setValue('prefer_not_to_say')
    await wrapper.get('input[name="birthDate"]').setValue('1990-05-20')
    await wrapper.get('textarea[name="bio"]').setValue('Hello')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(sessionClient.updateProfile).toHaveBeenCalledWith({
      firstName: 'Updated',
      lastName: 'Person',
      gender: 'prefer_not_to_say',
      birthDate: '1990-05-20',
      bio: 'Hello'
    })

    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(sessionClient.logout).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.fullPath).toBe('/login')
  })

  it('shows update and logout failures without redirecting', async () => {
    sessionClient.updateProfile.mockRejectedValue(new Error('Update failed'))
    sessionClient.logout.mockRejectedValue(new Error('Logout failed'))
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/profile', component: ProfileView },
        { path: '/login', component: { template: '<p>Login</p>' } }
      ]
    })
    await router.push('/profile')
    const wrapper = mount(ProfileView, { global: { plugins: [createPinia(), PiniaColada, router], stubs: { Select: USelectStub } } })
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
