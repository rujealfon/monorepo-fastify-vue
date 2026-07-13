import { describe, expect, it } from 'vitest'

import { outranks, roleAtLeast } from '#api/modules/users/users.roles.js'

describe('users.roles', () => {
  it('roleAtLeast follows the super_admin > admin > user hierarchy', () => {
    expect(roleAtLeast('super_admin', 'admin')).toBe(true)
    expect(roleAtLeast('admin', 'admin')).toBe(true)
    expect(roleAtLeast('user', 'admin')).toBe(false)
    expect(roleAtLeast('admin', 'super_admin')).toBe(false)
    expect(roleAtLeast('user', 'user')).toBe(true)
  })

  it('outranks is strict', () => {
    expect(outranks('super_admin', 'admin')).toBe(true)
    expect(outranks('admin', 'user')).toBe(true)
    expect(outranks('admin', 'admin')).toBe(false)
    expect(outranks('user', 'admin')).toBe(false)
  })
})
