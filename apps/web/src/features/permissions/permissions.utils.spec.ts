import { describe, expect, it } from 'vitest'

import { can, createAbility } from './permissions.utils'

const authorization = {
  user: { id: 'user-1', email: 'person@example.com' },
  roles: [],
  rules: [
    { action: 'read', subject: 'tasks', conditions: { userId: 'user-1' } },
    { action: 'read', subject: 'roles' }
  ],
  authorizationVersion: 1
}

describe('permission abilities', () => {
  it('checks subject types and resource attributes', () => {
    const ability = createAbility(authorization)

    expect(can(ability, 'read', 'roles')).toBe(true)
    expect(can(ability, 'read', 'tasks', { userId: 'user-1' })).toBe(true)
    expect(can(ability, 'read', 'tasks', { userId: 'user-2' })).toBe(false)
  })
})
