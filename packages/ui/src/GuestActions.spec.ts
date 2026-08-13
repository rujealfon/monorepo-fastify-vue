import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import GuestActions from './GuestActions.vue'

const UButton = {
  props: ['label', 'to'],
  template: '<a :href="to">{{ label }}</a>'
}

function mountActions(props: Partial<InstanceType<typeof GuestActions>['$props']> = {}) {
  return mount(GuestActions, {
    props: { loginHref: '/login', registerHref: '/register', ...props },
    global: { stubs: { UButton } }
  })
}

describe('guest actions', () => {
  it('renders both links when no page is active', () => {
    const wrapper = mountActions()
    expect(wrapper.get('a[href="/login"]').text()).toBe('Login')
    expect(wrapper.get('a[href="/register"]').text()).toBe('Register')
  })

  it('hides the link for the currently active page', () => {
    const onLogin = mountActions({ activePath: '/login' })
    expect(onLogin.find('a[href="/login"]').exists()).toBe(false)
    expect(onLogin.get('a[href="/register"]').text()).toBe('Register')

    const onRegister = mountActions({ activePath: '/register' })
    expect(onRegister.get('a[href="/login"]').text()).toBe('Login')
    expect(onRegister.find('a[href="/register"]').exists()).toBe(false)
  })
})
