import type { AssignedRole, CreateRole, PatchRole } from './roles.schema.js'

import { recordAuditEvent } from '#api/modules/audit-logs'
import { findPermissionsByIds, WILDCARD_PERMISSION } from '#api/modules/permissions'

import {
  LastSuperAdminError,
  PermissionEscalationError,
  RoleNotFoundError,
  RoleSlugTakenError,
  SuperAdminAssignmentError,
  SystemRoleProtectedError,
  TargetUserNotFoundError,
  UnknownPermissionIdsError,
  UnknownRoleIdsError
} from './roles.errors.js'
import * as repository from './roles.repository.js'
import { SUPER_ADMIN_SLUG } from './roles.schema.js'

export type AuthorizationContext = {
  user: { id: string, email: string }
  roles: AssignedRole[]
  permissions: Set<string>
  authorizationVersion: number
}

export async function getAuthorization(userId: string): Promise<AuthorizationContext | null> {
  const rows = await repository.findAuthorizationRows(userId)
  const firstRow = rows.at(0)
  if (!firstRow)
    return null

  const roleMap = new Map<number, AssignedRole>()
  const permissions = new Set<string>()

  for (const row of rows) {
    if (row.roleId !== null && row.roleName !== null && row.roleSlug !== null)
      roleMap.set(row.roleId, { id: row.roleId, name: row.roleName, slug: row.roleSlug })
    if (row.permissionKey !== null)
      permissions.add(row.permissionKey)
  }

  return {
    user: { id: firstRow.userId, email: firstRow.email },
    roles: [...roleMap.values()],
    permissions,
    authorizationVersion: firstRow.authorizationVersion
  }
}

export function listRoles() {
  return repository.findRoles()
}

async function requireRole(roleId: number) {
  const role = await repository.findRoleById(roleId)
  if (!role)
    throw new RoleNotFoundError()
  return role
}

export async function getRole(roleId: number) {
  const role = await requireRole(roleId)
  return { ...role, permissions: await repository.findRolePermissions(roleId) }
}

export async function createRole(data: CreateRole, actorId: string) {
  try {
    const role = await repository.insertRole(data)
    await recordAuditEvent({
      actorId,
      action: 'role.created',
      entityType: 'role',
      entityId: role.id,
      metadata: { name: role.name, slug: role.slug }
    })
    return { ...role, permissions: [] }
  }
  catch (error) {
    const cause = typeof error === 'object' && error && 'cause' in error ? error.cause : error
    if (typeof cause === 'object' && cause && 'code' in cause && cause.code === '23505')
      throw new RoleSlugTakenError()
    throw new Error('Could not create role', { cause: error })
  }
}

export async function updateRole(roleId: number, data: PatchRole, actorId: string) {
  const role = await requireRole(roleId)
  if (role.slug === SUPER_ADMIN_SLUG && data.isActive === false)
    throw new SystemRoleProtectedError('The super admin role cannot be deactivated')
  const changedKeys = Object.keys(data) as (keyof PatchRole)[]
  const updated = await repository.updateRoleById(roleId, data, tx => recordAuditEvent({
    actorId,
    action: 'role.updated',
    entityType: 'role',
    entityId: roleId,
    metadata: {
      before: Object.fromEntries(changedKeys.map(key => [key, role[key]])),
      after: Object.fromEntries(changedKeys.map(key => [key, data[key]]))
    }
  }, tx))
  if (!updated)
    throw new RoleNotFoundError()
  return { ...updated, permissions: await repository.findRolePermissions(roleId) }
}

export async function deleteRole(roleId: number, actorId: string) {
  const role = await requireRole(roleId)
  if (role.isSystem || (await repository.findPermissionKeysByRoleIds([roleId])).includes(WILDCARD_PERMISSION))
    throw new SystemRoleProtectedError()
  await repository.deleteRoleById(roleId, tx => recordAuditEvent({
    actorId,
    action: 'role.deleted',
    entityType: 'role',
    entityId: roleId,
    metadata: { name: role.name, slug: role.slug }
  }, tx))
}

export function validateAssignablePermissions(callerPermissions: ReadonlySet<string>, requestedKeys: readonly string[]) {
  if (callerPermissions.has(WILDCARD_PERMISSION))
    return
  if (requestedKeys.some(key => !callerPermissions.has(key)))
    throw new PermissionEscalationError()
}

export async function replaceRolePermissions(roleId: number, permissionIds: number[], caller: AuthorizationContext) {
  const role = await requireRole(roleId)

  const uniqueIds = [...new Set(permissionIds)]
  const requested = await findPermissionsByIds(uniqueIds)
  if (requested.length !== uniqueIds.length)
    throw new UnknownPermissionIdsError()

  const requestedKeys = requested.map(permission => permission.key)
  validateAssignablePermissions(caller.permissions, requestedKeys)

  if (role.slug === SUPER_ADMIN_SLUG && !requestedKeys.includes(WILDCARD_PERMISSION))
    throw new SystemRoleProtectedError('The super admin role must keep the wildcard permission')

  const previousPermissionIds = (await repository.findRolePermissions(roleId)).map(permission => permission.id)
  await repository.replaceRolePermissions(roleId, uniqueIds, caller.user.id, tx => recordAuditEvent({
    actorId: caller.user.id,
    action: 'role.permissions_replaced',
    entityType: 'role',
    entityId: roleId,
    metadata: { previousPermissionIds, permissionIds: uniqueIds, permissionKeys: requestedKeys }
  }, tx))
  return getRole(roleId)
}

export async function listUsers(page: number, limit: number, search?: string) {
  const { data, total } = await repository.findUsersWithRoles(page, limit, search)
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  }
}

async function requireUser(userId: string) {
  const user = await repository.findUserById(userId)
  if (!user)
    throw new TargetUserNotFoundError()
}

export async function getUserRoles(userId: string) {
  await requireUser(userId)
  return repository.findUserRoles(userId)
}

export async function replaceUserRoles(userId: string, roleIds: number[], caller: AuthorizationContext) {
  await requireUser(userId)

  const uniqueIds = [...new Set(roleIds)]
  const requested = await repository.findRolesByIds(uniqueIds)
  if (requested.length !== uniqueIds.length)
    throw new UnknownRoleIdsError()

  const currentRoles = await repository.findUserRoles(userId)
  const [currentPermissionKeys, requestedPermissionKeys] = await Promise.all([
    repository.findPermissionKeysByRoleIds(currentRoles.map(role => role.id)),
    repository.findPermissionKeysByRoleIds(uniqueIds)
  ])
  const currentHasWildcard = currentPermissionKeys.includes(WILDCARD_PERMISSION)
  const requestedHasWildcard = requestedPermissionKeys.includes(WILDCARD_PERMISSION)

  const grantsWildcard = requestedHasWildcard && !currentHasWildcard
  const revokesWildcard = currentHasWildcard && !requestedHasWildcard

  if ((grantsWildcard || revokesWildcard) && !caller.permissions.has(WILDCARD_PERMISSION))
    throw new SuperAdminAssignmentError()

  validateAssignablePermissions(caller.permissions, requestedPermissionKeys)

  const replaced = await repository.replaceUserRoles(
    userId,
    uniqueIds,
    caller.user.id,
    revokesWildcard,
    tx => recordAuditEvent({
      actorId: caller.user.id,
      action: 'user.roles_replaced',
      entityType: 'user',
      entityId: userId,
      metadata: { previousRoleIds: currentRoles.map(role => role.id), roleIds: uniqueIds }
    }, tx)
  )
  if (!replaced)
    throw new LastSuperAdminError()
  return repository.findUserRoles(userId)
}

export const assignRoleBySlug = repository.assignRoleBySlug
