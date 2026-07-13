import type { CreateRole, Permission, Role, UpdateRole } from './roles.schema.js'

import { RoleInUseError, RoleNameTakenError, RoleNotFoundError, SystemRoleImmutableError } from './roles.errors.js'
import * as repository from './roles.repository.js'
import { PERMISSION_CATALOG, PERMISSIONS } from './roles.schema.js'

export function isSuperAdminRole(role: { isSystem: boolean, name: string }) {
  return role.isSystem && role.name === 'super_admin'
}

// super_admin's permissions are computed, never stored: the invariant cannot drift
// and new catalog entries are granted automatically
function withComputedPermissions(role: Awaited<ReturnType<typeof repository.findMany>>[number]): Role {
  return {
    ...role,
    permissions: (isSuperAdminRole(role) ? [...PERMISSIONS] : role.permissions) as Permission[]
  }
}

function isUniqueViolation(error: unknown) {
  const cause = typeof error === 'object' && error && 'cause' in error ? error.cause : error
  return typeof cause === 'object' && !!cause && 'code' in cause && cause.code === '23505'
}

export async function listRoles() {
  const roles = await repository.findMany()
  return { data: roles.map(withComputedPermissions) }
}

export async function getRole(id: string) {
  const role = await repository.findById(id)
  if (!role)
    throw new RoleNotFoundError()
  return withComputedPermissions(role)
}

export async function createRole(data: CreateRole) {
  try {
    return await getRole(await repository.insert(data))
  }
  catch (error) {
    if (isUniqueViolation(error))
      throw new RoleNameTakenError()
    throw error
  }
}

export async function updateRole(id: string, data: UpdateRole) {
  const role = await repository.findById(id)
  if (!role)
    throw new RoleNotFoundError()
  if (role.isSystem && data.name !== undefined && data.name !== role.name)
    throw new SystemRoleImmutableError('System roles cannot be renamed')
  if (isSuperAdminRole(role) && data.permissions !== undefined)
    throw new SystemRoleImmutableError('The super admin role always has every permission')

  try {
    await repository.update(id, data)
  }
  catch (error) {
    if (isUniqueViolation(error))
      throw new RoleNameTakenError()
    throw error
  }
  return getRole(id)
}

export async function deleteRole(id: string) {
  const role = await repository.findById(id)
  if (!role)
    throw new RoleNotFoundError()
  if (role.isSystem)
    throw new SystemRoleImmutableError('System roles cannot be deleted')
  if (role.userCount > 0)
    throw new RoleInUseError()
  await repository.deleteById(id)
}

export function getPermissionCatalog() {
  return {
    data: PERMISSION_CATALOG.map(group => ({
      group: group.group,
      permissions: group.permissions.map(permission => ({ ...permission }))
    }))
  }
}

export function getRoleByName(name: string) {
  return repository.findByName(name)
}
