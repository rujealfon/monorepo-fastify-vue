import type { MongoAbility } from '@casl/ability'
import type { AbilityRule, SelectPermission } from './permissions.schema.js'

import { createMongoAbility } from '@casl/ability'

import { WILDCARD_PERMISSION } from './permissions.schema.js'

export type AppAbility = MongoAbility<[string, string]>
type PermissionGrant = Pick<SelectPermission, 'action' | 'key' | 'resource'>

const scopedRules: Record<string, (userId: string) => AbilityRule> = {
  'profile.read_own': userId => ({ action: 'read', subject: 'profile', conditions: { id: userId } }),
  'profile.update_own': userId => ({ action: 'update', subject: 'profile', conditions: { id: userId } }),
  'tasks.delete': userId => ({ action: 'delete', subject: 'tasks', conditions: { userId } }),
  'tasks.read': userId => ({ action: 'read', subject: 'tasks', conditions: { userId } }),
  'tasks.update': userId => ({ action: 'update', subject: 'tasks', conditions: { userId } })
}

export function buildAbilityRules(userId: string, permissions: readonly PermissionGrant[]): AbilityRule[] {
  const rules = new Map<string, AbilityRule>()

  for (const permission of permissions) {
    const rule = permission.key === WILDCARD_PERMISSION
      ? { action: 'manage', subject: 'all' }
      : scopedRules[permission.key]?.(userId) ?? { action: permission.action, subject: permission.resource }
    rules.set(permission.key, rule)
  }

  return [...rules.values()]
}

export function createAppAbility(rules: AbilityRule[]): AppAbility {
  return createMongoAbility<[string, string]>(rules)
}
