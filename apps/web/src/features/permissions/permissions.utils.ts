import type { MongoAbility } from '@casl/ability'
import type { Authorization } from '@monorepo-fastify-vue/api-client'

import { createMongoAbility, subject } from '@casl/ability'

export function createAbility(authorization: Authorization | null | undefined) {
  return createMongoAbility(authorization?.rules ?? [])
}

export function can(ability: MongoAbility, action: string, subjectType: string, resource?: Record<string, unknown>) {
  return ability.can(action, resource ? subject(subjectType, resource) : subjectType)
}
