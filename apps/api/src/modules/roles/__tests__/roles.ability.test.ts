import { describe, expect, it } from 'vitest'

import { defineAbility } from '#api/modules/roles/roles.ability.js'

describe('defineAbility', () => {
  it('grants everything for a manage-all rule', () => {
    const ability = defineAbility([{ action: 'manage', subject: 'all' }])

    expect(ability.can('read', 'User')).toBe(true)
    expect(ability.can('update', 'User')).toBe(true)
    expect(ability.can('delete', 'Role')).toBe(true)
  })

  it('grants only the listed action and subject pairs', () => {
    const ability = defineAbility([
      { action: 'read', subject: 'User', conditions: null },
      { action: 'update', subject: 'User', conditions: null }
    ])

    expect(ability.can('read', 'User')).toBe(true)
    expect(ability.can('update', 'User')).toBe(true)
    expect(ability.can('delete', 'User')).toBe(false)
    expect(ability.can('read', 'Role')).toBe(false)
  })

  it('denies everything for an empty rule set', () => {
    const ability = defineAbility([])

    expect(ability.can('read', 'User')).toBe(false)
    expect(ability.cannot('manage', 'all')).toBe(true)
  })
})
