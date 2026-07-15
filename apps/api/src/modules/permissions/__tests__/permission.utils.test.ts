import { describe, expect, it } from 'vitest'

import { hasAllPermissions, hasAnyPermission, hasPermission } from '#api/modules/permissions/permission.utils.js'

describe('permission.utils', () => {
  const granted = new Set(['users.read', 'users.update'])

  it('matches exact permission keys', () => {
    expect(hasPermission(granted, 'users.read')).toBe(true)
    expect(hasPermission(granted, 'users.delete')).toBe(false)
  })

  it('grants everything to the wildcard', () => {
    const wildcard = new Set(['*'])
    expect(hasPermission(wildcard, 'users.delete')).toBe(true)
    expect(hasAllPermissions(wildcard, ['roles.read', 'roles.delete'])).toBe(true)
  })

  it('requires every permission in all mode', () => {
    expect(hasAllPermissions(granted, ['users.read', 'users.update'])).toBe(true)
    expect(hasAllPermissions(granted, ['users.read', 'users.delete'])).toBe(false)
  })

  it('requires at least one permission in any mode', () => {
    expect(hasAnyPermission(granted, ['users.delete', 'users.read'])).toBe(true)
    expect(hasAnyPermission(granted, ['users.delete', 'roles.read'])).toBe(false)
  })

  it('treats an empty requirement list as all-pass and any-fail', () => {
    expect(hasAllPermissions(granted, [])).toBe(true)
    expect(hasAnyPermission(granted, [])).toBe(false)
  })
})
