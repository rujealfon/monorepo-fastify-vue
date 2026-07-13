import type { Role } from './users.schema.js'

import { roleEnum } from './users.schema.js'

function rank(role: Role) {
  return roleEnum.enumValues.indexOf(role)
}

export function roleAtLeast(actual: Role, required: Role) {
  return rank(actual) >= rank(required)
}

export function outranks(actor: Role, target: Role) {
  return rank(actor) > rank(target)
}
