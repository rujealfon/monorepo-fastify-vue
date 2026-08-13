import type { Component } from 'vue'
import { RpcError } from '@monorepo-fastify-vue/api-client'
import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import LoginView from './LoginView.vue'
import RegisterView from './RegisterView.vue'

const sessionClient = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ sessionClient }))

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
      { path: '/health', component: { template: '<p>Health</p>' } }
    ]
  })
  await router.push(path)
  await router.isReady()
  const pinia = createPinia()
  return { router, wrapper: mount(component, { global: { plugins: [pinia, PiniaColada, router] } }) }
}

describe('authentication views', () => {
  beforeEach(() => vi.resetAllMocks())

  it('logs in and honors only internal redirects', async () => {
    sessionClient.login.mockResolvedValue(user)
    const { router, wrapper } = await mountAt(LoginView, '/login?redirect=/health')
    await wrapper.get('input[name="email"]').setValue(user.email)
    await wrapper.get('input[name="password"]').setValue('correct horse battery staple')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/health')

    const unsafe = await mountAt(LoginView, '/login?redirect=//evil.example')
    await unsafe.wrapper.get('input[name="email"]').setValue(user.email)
    await unsafe.wrapper.get('input[name="password"]').setValue('correct horse battery staple')
    await unsafe.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(unsafe.router.currentRoute.value.fullPath).toBe('/profile')
  })

  it('shows login errors and registers a user', async () => {
    sessionClient.login.mockRejectedValueOnce(new Error('Invalid credentials'))
    const login = await mountAt(LoginView, '/login')
    await login.wrapper.get('input[name="email"]').setValue(user.email)
    await login.wrapper.get('input[name="password"]').setValue('incorrect password')
    await login.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(login.wrapper.get('[role="alert"]').text()).toContain('Invalid')

    sessionClient.register.mockResolvedValueOnce(undefined)
    const registration = await mountAt(RegisterView, '/register?redirect=/health')
    await registration.wrapper.get('input[name="email"]').setValue(user.email)
    await registration.wrapper.get('input[name="password"]').setValue('correct horse battery staple')
    await registration.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(sessionClient.register).toHaveBeenLastCalledWith({ email: user.email, password: 'correct horse battery staple' })
    expect(registration.router.currentRoute.value.fullPath).toBe('/login?redirect=/health')
  })

  it('shows registration errors without redirecting', async () => {
    sessionClient.register.mockRejectedValue(new Error('Registration failed'))
    const registration = await mountAt(RegisterView, '/register')
    await registration.wrapper.get('input[name="email"]').setValue(user.email)
    await registration.wrapper.get('input[name="password"]').setValue('correct horse battery staple')
    await registration.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(registration.wrapper.get('[role="alert"]').text()).toContain('Registration failed')
    expect(registration.router.currentRoute.value.fullPath).toBe('/register')
  })

  it('shows API validation errors on their fields', async () => {
    sessionClient.register.mockRejectedValue(new RpcError(422, {
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: 'Validation failed',
      details: [{ instancePath: '/email', message: 'Invalid email address' }]
    }))
    const registration = await mountAt(RegisterView, '/register')
    await registration.wrapper.get('input[name="email"]').setValue('invalid')
    await registration.wrapper.get('input[name="password"]').setValue('correct horse battery staple')
    await registration.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(registration.wrapper.text()).toContain('Invalid email address')
  })
})
