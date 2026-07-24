import type { SelectAbilityRule } from '#api/modules/authorization'

import { describe, expect, it } from 'vitest'

import { buildAbility, resolveActorReferences, subject, toEffectiveRules, validateConditions } from '#api/modules/authorization'

const actor = { id: 'actor-1', email: 'actor@example.com', roleSlugs: ['standard-user'] }

function rule(overrides: Partial<SelectAbilityRule>): SelectAbilityRule {
  return {
    id: 1,
    key: 'test.rule',
    description: null,
    effect: 'allow',
    action: 'read',
    subject: 'Task',
    fields: null,
    actorConditions: null,
    resourceConditions: null,
    denialReason: null,
    priority: 0,
    isSystem: false,
    isActive: true,
    conditionSchemaVersion: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides
  }
}

describe('authorization ability', () => {
  it('deduplicates, filters inactive rules, and resolves actor references', () => {
    const shared = rule({ resourceConditions: { userId: { $eq: { $ref: 'actor.id' } } } })
    expect(toEffectiveRules([shared, shared, rule({ id: 2, key: 'inactive', isActive: false })], actor)).toEqual([{
      action: 'read',
      subject: 'Task',
      conditions: { userId: { $eq: 'actor-1' } }
    }])
  })

  it('gives higher priority rules precedence and deny wins at equal priority', () => {
    const ability = buildAbility([
      rule({ id: 1, effect: 'allow', priority: 1 }),
      rule({ id: 2, effect: 'deny', priority: 1, resourceConditions: { done: true } }),
      rule({ id: 3, effect: 'allow', priority: 2, resourceConditions: { id: 7 } })
    ], actor)
    expect(ability.can('read', subject('Task', { id: 1, done: false }))).toBe(true)
    expect(ability.can('read', subject('Task', { id: 1, done: true }))).toBe(false)
    expect(ability.can('read', subject('Task', { id: 7, done: true }))).toBe(true)
  })

  it('enforces field restrictions', () => {
    const ability = buildAbility([rule({ fields: ['name'] })], actor)
    const task = subject('Task', { id: 1 })
    expect(ability.can('read', task, 'name')).toBe(true)
    expect(ability.can('read', task, 'done')).toBe(false)
  })

  it('rejects unsupported fields, operators, depth, and oversized sets', () => {
    expect(() => validateConditions({ secret: 1 }, 'Task', 'resource')).toThrow(/Unknown/)
    expect(() => validateConditions({ id: { $regex: '.*' } }, 'Task', 'resource')).toThrow(/Unsupported/)
    expect(() => validateConditions({ id: { $in: Array.from({ length: 101 }, (_, index) => index) } }, 'Task', 'resource')).toThrow(/100/)
    expect(resolveActorReferences({ userId: { $eq: { $ref: 'actor.id' } } }, actor)).toEqual({ userId: { $eq: 'actor-1' } })
  })
})
