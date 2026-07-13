import type { Role } from './types.js'

// Rank order matches the API's role enum; `satisfies` breaks the typecheck if they drift.
export const USER_ROLES = ['user', 'admin', 'super_admin'] as const satisfies readonly Role[]

function rank(role: Role) {
  return USER_ROLES.indexOf(role)
}

export function roleAtLeast(actual: Role, required: Role) {
  return rank(actual) >= rank(required)
}

export function outranks(actor: Role, target: Role) {
  return rank(actor) > rank(target)
}
