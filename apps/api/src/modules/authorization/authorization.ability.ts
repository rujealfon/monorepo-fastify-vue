import type { MongoAbility, RawRuleOf } from '@casl/ability'
import type { AbilityAction, AbilitySubject } from './authorization.catalog.js'
import type { ActorContext } from './authorization.conditions.js'
import type { EffectiveAbilityRule, SelectAbilityRule } from './authorization.schema.js'

import { createMongoAbility, subject as tagSubject } from '@casl/ability'

import { AUTHORIZATION_CATALOG } from './authorization.catalog.js'
import { resolveActorReferences, validateConditions } from './authorization.conditions.js'

export type AppAbility = MongoAbility<[AbilityAction, AbilitySubject | object]>
export type AppRawRule = RawRuleOf<AppAbility>

function matchesActor(rule: SelectAbilityRule, actor: ActorContext) {
  if (!rule.actorConditions)
    return true
  validateConditions(rule.actorConditions, rule.subject, 'actor')
  const matcher = createMongoAbility([
    { action: 'read', subject: 'Actor', conditions: rule.actorConditions }
  ])
  return matcher.can('read', tagSubject('Actor', actor))
}

export function toEffectiveRules(rules: readonly SelectAbilityRule[], actor: ActorContext): EffectiveAbilityRule[] {
  const unique = new Map<number, SelectAbilityRule>()
  for (const rule of rules) {
    if (rule.isActive)
      unique.set(rule.id, rule)
  }

  return [...unique.values()]
    .filter(rule => matchesActor(rule, actor))
    .sort((left, right) =>
      left.priority - right.priority
      || (left.effect === right.effect ? 0 : left.effect === 'allow' ? -1 : 1)
      || left.id - right.id)
    .map((rule) => {
      validateConditions(rule.resourceConditions, rule.subject, 'resource')
      const conditions = rule.resourceConditions
        ? resolveActorReferences(rule.resourceConditions, actor) as Record<string, unknown>
        : undefined
      return {
        action: rule.action,
        subject: rule.subject,
        ...rule.fields?.length ? { fields: rule.fields } : {},
        ...conditions ? { conditions } : {},
        ...rule.effect === 'deny' ? { inverted: true } : {},
        ...rule.denialReason ? { reason: rule.denialReason } : {}
      }
    })
}

export function buildAbility(rules: readonly SelectAbilityRule[], actor: ActorContext) {
  return createMongoAbility<AppAbility>(toEffectiveRules(rules, actor) as AppRawRule[])
}

export function subject<T extends Record<string, unknown>>(type: AbilitySubject, record: T) {
  return tagSubject(type, record)
}

export function projectSubject<T extends Record<string, unknown>>(
  ability: AppAbility,
  type: Exclude<AbilitySubject, 'all' | 'AbilityRule'>,
  record: T
): Partial<T> & Pick<T, Extract<keyof T, 'id' | 'userId' | 'slug'>> {
  const catalog = AUTHORIZATION_CATALOG[type]
  const tagged = subject(type, record)
  return Object.fromEntries(catalog.readableFields
    .filter(field => catalog.identityFields.includes(field) || ability.can('read', tagged, field))
    .filter(field => field in record)
    .map(field => [field, record[field]])) as Partial<T> & Pick<T, Extract<keyof T, 'id' | 'userId' | 'slug'>>
}
