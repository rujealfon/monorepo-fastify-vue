import type { AppAbility } from './authorization.ability.js'
import type { ActorContext } from './authorization.conditions.js'
import type { CreateAbilityRule, PatchAbilityRule } from './authorization.schema.js'

import { recordAuditEvent } from '#api/modules/audit-logs'
import { buildAbility, toEffectiveRules } from './authorization.ability.js'
import { catalogResponse } from './authorization.catalog.js'
import {
  AbilityRuleKeyTakenError,
  AbilityRuleNotFoundError,
  InsufficientAbilityError,
  SystemAbilityRuleProtectedError,
  UnknownAbilityRuleIdsError
} from './authorization.errors.js'
import * as repository from './authorization.repository.js'
import { createAbilityRuleSchema } from './authorization.schema.js'

export type AuthorizationContext = {
  user: { id: string, email: string }
  roles: { id: number, name: string, slug: string }[]
  rules: ReturnType<typeof toEffectiveRules>
  ability: AppAbility
  authorizationVersion: number
}

export async function getAuthorization(userId: string): Promise<AuthorizationContext | null> {
  const rows = await repository.findAuthorizationRows(userId)
  const first = rows.at(0)
  if (!first)
    return null
  const roles = new Map<number, { id: number, name: string, slug: string }>()
  const rules = new Map<number, NonNullable<typeof first.rule>>()
  for (const row of rows) {
    if (row.roleId !== null && row.roleName !== null && row.roleSlug !== null)
      roles.set(row.roleId, { id: row.roleId, name: row.roleName, slug: row.roleSlug })
    if (row.rule)
      rules.set(row.rule.id, row.rule)
  }
  const actor: ActorContext = { id: first.userId, email: first.email, roleSlugs: [...roles.values()].map(role => role.slug) }
  const storedRules = [...rules.values()]
  return {
    user: { id: first.userId, email: first.email },
    roles: [...roles.values()],
    rules: toEffectiveRules(storedRules, actor),
    ability: buildAbility(storedRules, actor),
    authorizationVersion: first.authorizationVersion
  }
}

function requireRuleAdministrator(caller: AuthorizationContext) {
  if (!caller.ability.can('manage', 'all'))
    throw new InsufficientAbilityError()
}

export const getCatalog = () => catalogResponse
export const listRules = () => repository.findRules()
export const listRoleRules = (roleId: number) => repository.findRoleRules(roleId)

export async function getRule(id: number) {
  const rule = await repository.findRuleById(id)
  if (!rule)
    throw new AbilityRuleNotFoundError()
  return rule
}

export async function createRule(data: CreateAbilityRule, caller: AuthorizationContext) {
  requireRuleAdministrator(caller)
  try {
    return await repository.insertRule(data, tx => recordAuditEvent({
      actorId: caller.user.id,
      action: 'ability_rule.created',
      entityType: 'ability_rule',
      entityId: data.key,
      metadata: { key: data.key, effect: data.effect, action: data.action, subject: data.subject }
    }, tx))
  }
  catch (error) {
    const cause = typeof error === 'object' && error && 'cause' in error ? error.cause : error
    if (typeof cause === 'object' && cause && 'code' in cause && cause.code === '23505')
      throw new AbilityRuleKeyTakenError()
    throw error
  }
}

export async function updateRule(id: number, data: PatchAbilityRule, caller: AuthorizationContext) {
  requireRuleAdministrator(caller)
  const before = await getRule(id)
  if (before.key === 'system.manage_all')
    throw new SystemAbilityRuleProtectedError('The Super Admin manage all rule is immutable')
  createAbilityRuleSchema.parse({ ...before, ...data })
  if (before.isSystem && data.isActive === false)
    throw new SystemAbilityRuleProtectedError('System ability rules cannot be deactivated')
  const updated = await repository.updateRule(id, data, tx => recordAuditEvent({
    actorId: caller.user.id,
    action: 'ability_rule.updated',
    entityType: 'ability_rule',
    entityId: id,
    metadata: { changedFields: Object.keys(data) }
  }, tx))
  if (!updated)
    throw new AbilityRuleNotFoundError()
  return updated
}

export async function deleteRule(id: number, caller: AuthorizationContext) {
  requireRuleAdministrator(caller)
  const rule = await getRule(id)
  if (rule.isSystem)
    throw new SystemAbilityRuleProtectedError('System ability rules cannot be deleted')
  await repository.deleteRule(id, tx => recordAuditEvent({
    actorId: caller.user.id,
    action: 'ability_rule.deleted',
    entityType: 'ability_rule',
    entityId: id,
    metadata: { key: rule.key }
  }, tx))
}

export async function replaceRoleRules(roleId: number, ids: number[], caller: AuthorizationContext) {
  requireRuleAdministrator(caller)
  const uniqueIds = [...new Set(ids)]
  const rules = await repository.findRulesByIds(uniqueIds)
  if (rules.length !== uniqueIds.length)
    throw new UnknownAbilityRuleIdsError()
  await repository.replaceRoleRules(roleId, uniqueIds, caller.user.id, tx => recordAuditEvent({
    actorId: caller.user.id,
    action: 'role.ability_rules_replaced',
    entityType: 'role',
    entityId: roleId,
    metadata: { abilityRuleIds: uniqueIds }
  }, tx))
  return repository.findRoleRules(roleId)
}
