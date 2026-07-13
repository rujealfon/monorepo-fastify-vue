import type { AppAbility } from './roles.ability.js'
import type { CreateRole, UpdateRole } from './roles.schema.js'

import { PermissionGrantError, RoleAlreadyExistsError, RoleInUseError, RoleNotFoundError, RoleRankError, SystemRoleError } from './roles.errors.js'
import * as repository from './roles.repository.js'

export const SUPER_ADMIN_SLUG = 'super_admin'
export const DEFAULT_ROLE_SLUG = 'user'

// Structural view of request.actor — kept local so the roles module never
// imports from users (the dependency direction is users -> roles).
type RoleActor = { role: { id: string, rank: number }, ability: AppAbility }

function pgErrorCode(error: unknown) {
  const cause = typeof error === 'object' && error && 'cause' in error ? error.cause : error
  return typeof cause === 'object' && cause && 'code' in cause ? cause.code : undefined
}

function canManageAll(actor: RoleActor) {
  return actor.ability.can('manage', 'all')
}

// A non-manage-all actor may only touch roles ranked strictly below their own
// (which also blocks editing their own role) and may only grant permissions
// their own ability already holds — otherwise an `update Role` holder could
// self-escalate by adding `manage all` to a role.
function assertRankDominance(actor: RoleActor, ...ranks: number[]) {
  if (!ranks.every(rank => actor.role.rank > rank))
    throw new RoleRankError()
}

function assertGrantable(actor: RoleActor, permissions: CreateRole['permissions'] = []) {
  if (!permissions.every(permission => actor.ability.can(permission.action, permission.subject)))
    throw new PermissionGrantError()
}

export function listRoles() {
  return repository.findMany()
}

export function findRoleBySlug(slug: string) {
  return repository.findBySlug(slug)
}

export function getRolePermissions(roleId: string) {
  return repository.findPermissions(roleId)
}

export async function createRole(actor: RoleActor, data: CreateRole) {
  if (!canManageAll(actor)) {
    assertRankDominance(actor, data.rank)
    assertGrantable(actor, data.permissions)
  }
  try {
    return await repository.insert(data)
  }
  catch (error) {
    if (pgErrorCode(error) === '23505')
      throw new RoleAlreadyExistsError()
    throw error
  }
}

export async function updateRole(actor: RoleActor, id: string, data: UpdateRole) {
  const role = await repository.findById(id)
  if (!role)
    throw new RoleNotFoundError()
  if (role.isSystem && (role.slug === SUPER_ADMIN_SLUG || data.rank !== undefined))
    throw new SystemRoleError()
  if (!canManageAll(actor)) {
    assertRankDominance(actor, role.rank, ...(data.rank !== undefined ? [data.rank] : []))
    assertGrantable(actor, data.permissions)
  }
  return repository.update(id, data)
}

export async function deleteRole(actor: RoleActor, id: string) {
  const role = await repository.findById(id)
  if (!role)
    throw new RoleNotFoundError()
  if (role.isSystem)
    throw new SystemRoleError()
  if (!canManageAll(actor))
    assertRankDominance(actor, role.rank)
  try {
    await repository.deleteById(id)
  }
  catch (error) {
    if (pgErrorCode(error) === '23503')
      throw new RoleInUseError()
    throw error
  }
}
