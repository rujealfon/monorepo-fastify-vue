import type { CreateRole, UpdateRole } from './roles.schema.js'

import { RoleAlreadyExistsError, RoleInUseError, RoleNotFoundError, SystemRoleError } from './roles.errors.js'
import * as repository from './roles.repository.js'

export const SUPER_ADMIN_SLUG = 'super_admin'
export const DEFAULT_ROLE_SLUG = 'user'

function pgErrorCode(error: unknown) {
  const cause = typeof error === 'object' && error && 'cause' in error ? error.cause : error
  return typeof cause === 'object' && cause && 'code' in cause ? cause.code : undefined
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

export async function createRole(data: CreateRole) {
  try {
    return await repository.insert(data)
  }
  catch (error) {
    if (pgErrorCode(error) === '23505')
      throw new RoleAlreadyExistsError()
    throw error
  }
}

export async function updateRole(id: string, data: UpdateRole) {
  const role = await repository.findById(id)
  if (!role)
    throw new RoleNotFoundError()
  if (role.isSystem && (role.slug === SUPER_ADMIN_SLUG || data.rank !== undefined))
    throw new SystemRoleError()
  return repository.update(id, data)
}

export async function deleteRole(id: string) {
  const role = await repository.findById(id)
  if (!role)
    throw new RoleNotFoundError()
  if (role.isSystem)
    throw new SystemRoleError()
  try {
    await repository.deleteById(id)
  }
  catch (error) {
    if (pgErrorCode(error) === '23503')
      throw new RoleInUseError()
    throw error
  }
}
