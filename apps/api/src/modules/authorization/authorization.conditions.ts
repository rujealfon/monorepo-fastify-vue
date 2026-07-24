import type { AbilitySubject } from './authorization.catalog.js'

import { z } from 'zod'

import { AUTHORIZATION_CATALOG } from './authorization.catalog.js'

export type ActorContext = { id: string, email: string, roleSlugs: string[] }
export type ConditionDocument = Record<string, unknown>

const OPERATORS = new Set(['$eq', '$ne', '$in', '$nin', '$lt', '$lte', '$gt', '$gte', '$exists'])
const REFERENCES = new Set(['actor.id', 'actor.email', 'actor.roleSlugs'])

function byteLength(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).length
}

export function validateConditions(value: unknown, subject: AbilitySubject, kind: 'actor' | 'resource'): ConditionDocument | null {
  if (value === null || value === undefined)
    return null
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${kind} conditions must be an object`)
  if (byteLength(value) > 16 * 1024)
    throw new Error(`${kind} conditions exceed 16 KB`)

  const allowedFields = kind === 'actor'
    ? new Set(['id', 'email', 'roleSlugs'])
    : new Set(subject === 'all' || subject === 'AbilityRule' ? [] : AUTHORIZATION_CATALOG[subject].conditionFields)
  let predicates = 0

  const visit = (node: unknown, depth: number, path: string[]) => {
    if (depth > 6)
      throw new Error('Conditions cannot be deeper than six levels')
    if (node && typeof node === 'object' && !Array.isArray(node) && '$ref' in node) {
      const keys = Object.keys(node)
      if (keys.length !== 1 || typeof node.$ref !== 'string' || !REFERENCES.has(node.$ref))
        throw new Error(`Unknown actor reference at ${path.join('.')}`)
      return
    }
    if (!node || typeof node !== 'object' || Array.isArray(node))
      return
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) {
        if (!OPERATORS.has(key))
          throw new Error(`Unsupported condition operator ${key}`)
        predicates++
        if ((key === '$in' || key === '$nin') && (!Array.isArray(child) || child.length > 100))
          throw new Error(`${key} expects at most 100 values`)
        visit(child, depth + 1, [...path, key])
      }
      else {
        if (path.length > 0 || !allowedFields.has(key))
          throw new Error(`Unknown ${kind} condition field ${key}`)
        predicates++
        visit(child, depth + 1, [key])
      }
    }
  }
  visit(value, 1, [])
  if (predicates > 25)
    throw new Error('Conditions cannot contain more than 25 predicates')
  return value as ConditionDocument
}

export function resolveActorReferences(value: unknown, actor: ActorContext): unknown {
  if (Array.isArray(value))
    return value.map(item => resolveActorReferences(item, actor))
  if (!value || typeof value !== 'object')
    return value
  if ('$ref' in value && Object.keys(value).length === 1) {
    const ref = z.enum(['actor.id', 'actor.email', 'actor.roleSlugs']).parse(value.$ref)
    return ref === 'actor.id' ? actor.id : ref === 'actor.email' ? actor.email : actor.roleSlugs
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolveActorReferences(child, actor)]))
}
