import type { AuthorizationContext, PolicyExpression } from '#api/modules/users'

import { describe, expect, it } from 'vitest'

import { evaluatePolicyDecision, evaluatePolicyExpression, validatePolicyExpression } from '#api/modules/users/users.policy.js'

const actor = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'member@example.com',
  roles: ['member', 'reviewer']
}
const task = {
  id: 7,
  ownerId: actor.id,
  ownerEmail: actor.email,
  name: 'Ship policy engine',
  done: false
}

describe('policy expressions', () => {
  it('evaluates nested typed comparisons and role containment', () => {
    const expression: PolicyExpression = {
      type: 'all',
      children: [
        { type: 'compare', field: 'task.ownerId', operator: 'eq', value: { type: 'field', field: 'actor.id' } },
        {
          type: 'any',
          children: [
            { type: 'compare', field: 'actor.roles', operator: 'contains', value: { type: 'literal', value: 'reviewer' } },
            { type: 'not', child: { type: 'compare', field: 'task.done', operator: 'eq', value: { type: 'literal', value: true } } }
          ]
        }
      ]
    }
    expect(validatePolicyExpression(expression, 'tasks.update').success).toBe(true)
    expect(evaluatePolicyExpression(expression, actor, task)).toBe(true)
  })

  it.each([
    [{ type: 'compare', field: 'task.done', operator: 'startsWith', value: { type: 'literal', value: 'x' } }, 'tasks.read'],
    [{ type: 'compare', field: 'task.id', operator: 'eq', value: { type: 'literal', value: 1 } }, 'tasks.create'],
    [{ type: 'compare', field: 'task.ownerId', operator: 'eq', value: { type: 'field', field: 'task.name' } }, 'tasks.read'],
    [{ type: 'compare', field: 'task.id', operator: 'in', value: { type: 'literal', value: Array.from({ length: 51 }, (_, index) => index) } }, 'tasks.read']
  ] as const)('rejects incompatible or excessive expressions', (expression, permission) => {
    expect(validatePolicyExpression(expression, permission).success).toBe(false)
  })

  it('enforces depth and comparison limits', () => {
    let deep: PolicyExpression = { type: 'compare', field: 'task.done', operator: 'eq', value: { type: 'literal', value: false } }
    for (let index = 0; index < 5; index++)
      deep = { type: 'not', child: deep }
    expect(validatePolicyExpression(deep, 'tasks.read').success).toBe(false)

    const wide: PolicyExpression = {
      type: 'all',
      children: Array.from({ length: 3 }, () => ({
        type: 'all' as const,
        children: Array.from({ length: 9 }, () => ({ type: 'compare' as const, field: 'task.done' as const, operator: 'eq' as const, value: { type: 'literal' as const, value: false } }))
      }))
    }
    expect(validatePolicyExpression(wide, 'tasks.read').success).toBe(false)
  })

  it('makes a matching deny override allows and fails invalid stored policies closed', () => {
    const authorization: AuthorizationContext = {
      actor,
      admin: false,
      policies: [
        { id: '21111111-1111-4111-8111-111111111111', permission: 'tasks.read', effect: 'allow', condition: null },
        { id: '31111111-1111-4111-8111-111111111111', permission: 'tasks.read', effect: 'deny', condition: { type: 'script', source: 'true' } },
        { id: '41111111-1111-4111-8111-111111111111', permission: 'tasks.read', effect: 'allow', condition: { type: 'script', source: 'true' } }
      ]
    }
    expect(evaluatePolicyDecision(authorization, 'tasks.read', task)).toEqual({
      allowed: false,
      matchedAllowPolicyIds: ['21111111-1111-4111-8111-111111111111'],
      matchedDenyPolicyIds: ['31111111-1111-4111-8111-111111111111']
    })
  })
})
