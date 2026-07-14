import type { SQL, SQLWrapper } from 'drizzle-orm'
import type { PermissionKey, PolicyExpression, PolicyField, TaskPermissionKey } from './users.schema.js'

import { and, not, or, sql } from 'drizzle-orm'

import { isTaskPermissionKey, POLICY_FIELDS, policyExpressionSchema } from './users.schema.js'

const fieldTypes = {
  'actor.id': 'uuid',
  'actor.email': 'email',
  'actor.roles': 'roles',
  'task.id': 'number',
  'task.ownerId': 'uuid',
  'task.ownerEmail': 'email',
  'task.name': 'string',
  'task.done': 'boolean'
} as const

export type PolicyActor = { id: string, email: string, roles: string[] }
export type PolicyTask = {
  id?: number
  ownerId: string
  ownerEmail: string
  name: string
  done: boolean
}
export type ResolvedPolicy = {
  id: string
  permission: PermissionKey
  effect: 'allow' | 'deny'
  condition: unknown
}
export type AuthorizationContext = {
  actor: PolicyActor
  admin: boolean
  policies: ResolvedPolicy[]
}
export type PolicyDecision = {
  allowed: boolean
  matchedAllowPolicyIds: string[]
  matchedDenyPolicyIds: string[]
}

type ValidationResult = { success: true, data: PolicyExpression } | { success: false, error: string }

function literalMatches(field: PolicyField, value: unknown) {
  const type = fieldTypes[field]
  if (type === 'number')
    return typeof value === 'number' && Number.isFinite(value)
  if (type === 'boolean')
    return typeof value === 'boolean'
  if (type === 'uuid')
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  return typeof value === 'string'
}

export function validatePolicyExpression(expression: unknown, permission: PermissionKey): ValidationResult {
  const parsed = policyExpressionSchema.safeParse(expression)
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid policy expression' }

  let comparisons = 0
  let error = ''
  function visit(node: PolicyExpression, depth: number) {
    if (error)
      return
    if (depth > 5) {
      error = 'Policy expressions cannot exceed depth 5'
      return
    }
    if ('children' in node) {
      node.children.forEach(child => visit(child, depth + 1))
      return
    }
    if (node.type === 'not') {
      visit(node.child, depth + 1)
      return
    }

    comparisons++
    if (comparisons > 25) {
      error = 'Policy expressions cannot exceed 25 comparisons'
      return
    }
    if (permission === 'tasks.create' && (node.field === 'task.id' || (node.value.type === 'field' && node.value.field === 'task.id'))) {
      error = 'tasks.create policies cannot reference task.id'
      return
    }

    const leftType = fieldTypes[node.field]
    if (node.value.type === 'field') {
      if (!['eq', 'neq'].includes(node.operator) || leftType === 'roles' || fieldTypes[node.value.field] !== leftType)
        error = 'Field comparisons require compatible scalar fields and eq or neq'
      return
    }

    const value = node.value.value
    if (node.operator === 'in' || node.operator === 'notIn') {
      if (leftType === 'roles' || !Array.isArray(value) || value.length === 0 || value.length > 50 || !value.every(item => literalMatches(node.field, item)))
        error = 'Membership requires 1 to 50 literals compatible with the field'
      return
    }
    if (node.operator === 'contains') {
      if ((leftType !== 'string' && leftType !== 'email' && leftType !== 'roles') || typeof value !== 'string')
        error = 'contains requires a string or actor.roles field and a string literal'
      return
    }
    if (node.operator === 'startsWith' || node.operator === 'endsWith') {
      if ((leftType !== 'string' && leftType !== 'email') || typeof value !== 'string')
        error = `${node.operator} requires a string field and string literal`
      return
    }
    if (!literalMatches(node.field, value))
      error = 'Equality requires a literal compatible with the field'
  }
  visit(parsed.data, 1)
  return error ? { success: false, error } : { success: true, data: parsed.data }
}

function fieldValue(field: PolicyField, actor: PolicyActor, task?: PolicyTask) {
  switch (field) {
    case 'actor.id': return actor.id
    case 'actor.email': return actor.email
    case 'actor.roles': return actor.roles
    case 'task.id': return task?.id
    case 'task.ownerId': return task?.ownerId
    case 'task.ownerEmail': return task?.ownerEmail
    case 'task.name': return task?.name
    case 'task.done': return task?.done
  }
}

export function evaluatePolicyExpression(expression: PolicyExpression, actor: PolicyActor, task?: PolicyTask): boolean {
  if ('children' in expression) {
    return expression.type === 'all'
      ? expression.children.every(child => evaluatePolicyExpression(child, actor, task))
      : expression.children.some(child => evaluatePolicyExpression(child, actor, task))
  }
  if (expression.type === 'not')
    return !evaluatePolicyExpression(expression.child, actor, task)

  const left = fieldValue(expression.field, actor, task)
  const right = expression.value.type === 'field'
    ? fieldValue(expression.value.field, actor, task)
    : expression.value.value
  switch (expression.operator) {
    case 'eq': return left === right
    case 'neq': return left !== right
    case 'in': return Array.isArray(right) && right.includes(left)
    case 'notIn': return Array.isArray(right) && !right.includes(left)
    case 'contains': return Array.isArray(left) ? left.includes(right as string) : typeof left === 'string' && typeof right === 'string' && left.includes(right)
    case 'startsWith': return typeof left === 'string' && typeof right === 'string' && left.startsWith(right)
    case 'endsWith': return typeof left === 'string' && typeof right === 'string' && left.endsWith(right)
  }
  return false
}

export function hasPotentialAllow(authorization: AuthorizationContext, permission: PermissionKey) {
  return authorization.admin || authorization.policies.some(policy => policy.permission === permission
    && policy.effect === 'allow'
    && (policy.condition === null || validatePolicyExpression(policy.condition, permission).success))
}

export function evaluatePolicyDecision(authorization: AuthorizationContext, permission: PermissionKey, task?: PolicyTask): PolicyDecision {
  if (authorization.admin)
    return { allowed: true, matchedAllowPolicyIds: [], matchedDenyPolicyIds: [] }

  const matchedAllowPolicyIds: string[] = []
  const matchedDenyPolicyIds: string[] = []
  for (const policy of authorization.policies.filter(policy => policy.permission === permission)) {
    const validated = policy.condition === null
      ? { success: true as const, data: null }
      : validatePolicyExpression(policy.condition, permission)
    const matches = validated.success
      ? validated.data === null || evaluatePolicyExpression(validated.data, authorization.actor, task)
      : policy.effect === 'deny'
    if (matches)
      (policy.effect === 'deny' ? matchedDenyPolicyIds : matchedAllowPolicyIds).push(policy.id)
  }
  return {
    allowed: matchedAllowPolicyIds.length > 0 && matchedDenyPolicyIds.length === 0,
    matchedAllowPolicyIds,
    matchedDenyPolicyIds
  }
}

function sqlField(field: PolicyField, actor: PolicyActor, taskFields: Partial<Record<PolicyField, SQLWrapper>>): SQLWrapper {
  if (field.startsWith('actor.'))
    return sql`${fieldValue(field, actor)}`
  const value = taskFields[field]
  if (!value)
    throw new Error(`Missing SQL field ${field}`)
  return value
}

function likeLiteral(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

export function compilePolicyExpression(expression: PolicyExpression, actor: PolicyActor, taskFields: Partial<Record<PolicyField, SQLWrapper>>): SQL {
  if ('children' in expression) {
    return expression.type === 'all'
      ? and(...expression.children.map(child => compilePolicyExpression(child, actor, taskFields))) ?? sql`true`
      : or(...expression.children.map(child => compilePolicyExpression(child, actor, taskFields))) ?? sql`false`
  }
  if (expression.type === 'not')
    return not(compilePolicyExpression(expression.child, actor, taskFields))

  if (expression.field === 'actor.roles') {
    const matched = evaluatePolicyExpression(expression, actor)
    return matched ? sql`true` : sql`false`
  }
  const left = sqlField(expression.field, actor, taskFields)
  const right = expression.value.type === 'field'
    ? sqlField(expression.value.field, actor, taskFields)
    : expression.value.value
  switch (expression.operator) {
    case 'eq': return sql`${left} = ${right}`
    case 'neq': return sql`${left} <> ${right}`
    case 'in': return sql`${left} in (${sql.join((right as unknown[]).map(value => sql`${value}`), sql`, `)})`
    case 'notIn': return sql`${left} not in (${sql.join((right as unknown[]).map(value => sql`${value}`), sql`, `)})`
    case 'contains': return sql`${left} like ${`%${likeLiteral(right as string)}%`} escape '\\'`
    case 'startsWith': return sql`${left} like ${`${likeLiteral(right as string)}%`} escape '\\'`
    case 'endsWith': return sql`${left} like ${`%${likeLiteral(right as string)}`} escape '\\'`
  }
  return sql`false`
}

export function compilePolicyPredicate(authorization: AuthorizationContext, permission: TaskPermissionKey, taskFields: Partial<Record<PolicyField, SQLWrapper>>) {
  if (authorization.admin)
    return sql`true`
  const allows: SQL[] = []
  const denies: SQL[] = []
  for (const policy of authorization.policies.filter(policy => policy.permission === permission)) {
    if (policy.condition === null) {
      (policy.effect === 'allow' ? allows : denies).push(sql`true`)
      continue
    }
    const validated = validatePolicyExpression(policy.condition, permission)
    if (!validated.success) {
      if (policy.effect === 'deny')
        denies.push(sql`true`)
      continue
    }
    const target = policy.effect === 'allow' ? allows : denies
    target.push(compilePolicyExpression(validated.data, authorization.actor, taskFields))
  }
  const allow = or(...allows) ?? sql`false`
  const deny = or(...denies)
  return deny ? and(allow, not(deny))! : allow
}

export function conditionFieldsFor(permission: PermissionKey) {
  return isTaskPermissionKey(permission)
    ? POLICY_FIELDS.filter(field => permission !== 'tasks.create' || field !== 'task.id')
    : []
}
