import type { MongoAbility } from '@casl/ability'
import type { PermissionRule } from './roles.schema.js'

import { createMongoAbility } from '@casl/ability'

export type AppAbility = MongoAbility<[string, string]>

export function defineAbility(rules: Array<Pick<PermissionRule, 'action' | 'subject'> & { conditions?: PermissionRule['conditions'] }>): AppAbility {
  return createMongoAbility<[string, string]>(rules.map(({ action, subject, conditions }) => ({
    action,
    subject,
    ...(conditions ? { conditions } : {})
  })))
}
