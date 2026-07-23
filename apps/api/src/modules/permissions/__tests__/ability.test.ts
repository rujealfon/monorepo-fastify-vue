import { describe, expect, it } from 'vitest'

import { buildAbilityRules, createAppAbility } from '#api/modules/permissions'

const grants = [
  { key: 'tasks.read', resource: 'tasks', action: 'read' },
  { key: 'profile.update_own', resource: 'profile', action: 'update_own' },
  { key: 'roles.read', resource: 'roles', action: 'read' }
]

describe('abilities', () => {
  it('builds scoped and unconditional rules without duplicates', () => {
    expect(buildAbilityRules('user-1', [...grants, grants[0]])).toEqual([
      { action: 'read', subject: 'tasks', conditions: { userId: 'user-1' } },
      { action: 'update', subject: 'profile', conditions: { id: 'user-1' } },
      { action: 'read', subject: 'roles' }
    ])
  })

  it('maps the wildcard to manage all', () => {
    const rules = buildAbilityRules('user-1', [{ key: '*', resource: 'system', action: 'all' }])
    const ability = createAppAbility(rules)

    expect(rules).toEqual([{ action: 'manage', subject: 'all' }])
    expect(ability.can('delete', 'roles')).toBe(true)
  })
})
