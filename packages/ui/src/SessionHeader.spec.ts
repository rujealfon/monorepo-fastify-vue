import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import SessionHeader from './SessionHeader.vue'

const AppHeader = { template: '<header><slot name="right" /></header>' }
const UButton = {
  props: ['label', 'to'],
  template: '<a :href="to">{{ label }}</a>'
}
const UDropdownMenu = {
  props: ['items'],
  template: '<div><slot /><button type="button" @click="items[1][0].onSelect()">Logout</button></div>'
}

function mountHeader(props: Partial<InstanceType<typeof SessionHeader>['$props']> = {}) {
  return mount(SessionHeader, {
    props: {
      brandHref: '/',
      links: [],
      loginHref: '/login',
      onLogout: vi.fn().mockResolvedValue(undefined),
      profileHref: '/profile',
      registerHref: '/register',
      ...props
    },
    global: { stubs: { AppHeader, UButton, UDropdownMenu } }
  })
}

describe('session header', () => {
  it('renders guest navigation supplied by its adapter', () => {
    const wrapper = mountHeader()
    expect(wrapper.get('a[href="/login"]').text()).toBe('Login')
    expect(wrapper.get('a[href="/register"]').text()).toBe('Register')
  })

  it('executes logout and reports adapter failures', async () => {
    const failure = new Error('unavailable')
    const onLogout = vi.fn().mockRejectedValue(failure)
    const wrapper = mountHeader({ onLogout, userEmail: 'person@example.com' })

    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(wrapper.emitted('logoutError')).toEqual([[failure]]))
    expect(onLogout).toHaveBeenCalledOnce()
  })
})
