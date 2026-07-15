import type { Component } from 'vue'
import { PiniaColada, useQueryCache } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { PROFILE_KEY } from '@/features/profile'
import LoginView from './LoginView.vue'
import RegisterView from './RegisterView.vue'

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ api }))

const user = {
  id: '1',
  email: 'person@example.com',
  profile: { firstName: null, lastName: null, gender: null, birthDate: null, bio: null, createdAt: '', updatedAt: '' },
  createdAt: '',
  updatedAt: ''
}

async function mountAt(component: Component, path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/register', component: RegisterView },
      { path: '/profile', component: { template: '<p>Profile</p>' } },
      { path: '/tasks', component: { template: '<p>Tasks</p>' } }
    ]
  })
  await router.push(path)
  await router.isReady()
  const pinia = createPinia()
  return { pinia, router, wrapper: mount(component, { global: { plugins: [pinia, PiniaColada, router] } }) }
}

describe('authentication views', () => {
  beforeEach(() => vi.clearAllMocks())

  it('logs in and honors only internal redirects', async () => {
    api.POST.mockResolvedValue({ data: user, response: { ok: true, status: 200 } })
    const { pinia, router, wrapper } = await mountAt(LoginView, '/login?redirect=/tasks')
    await wrapper.get('input[name="email"]').setValue(user.email)
    await wrapper.get('input[name="password"]').setValue('correct horse battery staple')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/tasks')
    expect(useQueryCache(pinia).getQueryData(PROFILE_KEY)).toEqual(user)

    const unsafe = await mountAt(LoginView, '/login?redirect=//evil.example')
    await unsafe.wrapper.get('input[name="email"]').setValue(user.email)
    await unsafe.wrapper.get('input[name="password"]').setValue('correct horse battery staple')
    await unsafe.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(unsafe.router.currentRoute.value.fullPath).toBe('/profile')
  })

  it('shows login errors and registers a user', async () => {
    api.POST.mockResolvedValueOnce({ response: { ok: false, status: 401 } })
    const login = await mountAt(LoginView, '/login')
    await login.wrapper.get('input[name="email"]').setValue(user.email)
    await login.wrapper.get('input[name="password"]').setValue('incorrect password')
    await login.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(login.wrapper.get('[role="alert"]').text()).toContain('Invalid')

    api.POST.mockResolvedValueOnce({ data: user, response: { ok: true, status: 201 } })
    const registration = await mountAt(RegisterView, '/register')
    await registration.wrapper.get('input[name="email"]').setValue(user.email)
    await registration.wrapper.get('input[name="password"]').setValue('correct horse battery staple')
    await registration.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.POST).toHaveBeenLastCalledWith('/api/v1/auth/register', {
      body: { email: user.email, password: 'correct horse battery staple' }
    })
    expect(registration.router.currentRoute.value.fullPath).toBe('/profile')
    expect(useQueryCache(registration.pinia).getQueryData(PROFILE_KEY)).toEqual(user)
  })

  it('shows registration errors without redirecting', async () => {
    api.POST.mockResolvedValue({ response: { ok: false, status: 409 } })
    const registration = await mountAt(RegisterView, '/register')
    await registration.wrapper.get('input[name="email"]').setValue(user.email)
    await registration.wrapper.get('input[name="password"]').setValue('correct horse battery staple')
    await registration.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(registration.wrapper.get('[role="alert"]').text()).toContain('Registration failed')
    expect(registration.router.currentRoute.value.fullPath).toBe('/register')
  })

  it('shows API validation errors on their fields', async () => {
    api.POST.mockResolvedValue({
      error: {
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Validation failed',
        details: [{ instancePath: '/email', message: 'Invalid email address' }]
      },
      response: { ok: false, status: 422 }
    })
    const registration = await mountAt(RegisterView, '/register')
    await registration.wrapper.get('input[name="email"]').setValue('invalid')
    await registration.wrapper.get('input[name="password"]').setValue('correct horse battery staple')
    await registration.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(registration.wrapper.text()).toContain('Invalid email address')
  })
})
