import type { AuthorizationContext } from '#api/modules/authorization'
import type { CreateRole, PatchRole } from './roles.schema.js'

import { recordAuditEvent } from '#api/modules/audit-logs'
import { listRoleRules, projectSubject, replaceRoleRules as replaceAssignedRoleRules, subject } from '#api/modules/authorization'

import {
  AbilityEscalationError,
  AtLeastOneRoleRequiredError,
  LastSuperAdminError,
  RoleNotFoundError,
  RoleSlugTakenError,
  SoleAssignedRoleError,
  SuperAdminAssignmentError,
  SystemRoleProtectedError,
  TargetUserNotFoundError,
  UnknownRoleIdsError
} from './roles.errors.js'
import * as repository from './roles.repository.js'
import { SUPER_ADMIN_SLUG } from './roles.schema.js'

function projectRole<T extends Record<string, unknown>>(caller: AuthorizationContext | undefined, role: T) {
  return caller ? projectSubject(caller.ability, 'Role', role) : role
}

export async function listRoles(caller?: AuthorizationContext) {
  const found = await repository.findRoles(caller?.ability)
  return found.map(role => projectRole(caller, role))
}

async function requireRole(roleId: number) {
  const role = await repository.findRoleById(roleId)
  if (!role)
    throw new RoleNotFoundError()
  return role
}

export async function getRole(roleId: number, caller?: AuthorizationContext) {
  const role = await requireRole(roleId)
  if (caller && !caller.ability.can('read', subject('Role', role)))
    throw new RoleNotFoundError()
  return projectRole(caller, { ...role, abilityRules: await listRoleRules(roleId) })
}

export async function createRole(data: CreateRole, actorId: string, caller?: AuthorizationContext) {
  if (caller && !caller.ability.can('create', subject('Role', { ...data, isSystem: false, isActive: true })))
    throw new AbilityEscalationError()
  try {
    const role = await repository.insertRole(data)
    await recordAuditEvent({
      actorId,
      action: 'role.created',
      entityType: 'role',
      entityId: role.id,
      metadata: { name: role.name, slug: role.slug }
    })
    return projectRole(caller, { ...role, abilityRules: [] })
  }
  catch (error) {
    const cause = typeof error === 'object' && error && 'cause' in error ? error.cause : error
    if (typeof cause === 'object' && cause && 'code' in cause && cause.code === '23505')
      throw new RoleSlugTakenError()
    throw new Error('Could not create role', { cause: error })
  }
}

export async function updateRole(roleId: number, data: PatchRole, actorId: string, caller?: AuthorizationContext) {
  const role = await requireRole(roleId)
  if (caller && (!caller.ability.can('update', subject('Role', role))
    || Object.keys(data).some(field => !caller.ability.can('update', subject('Role', role), field)))) {
    throw new AbilityEscalationError()
  }
  if (role.isSystem && data.isActive === false)
    throw new SystemRoleProtectedError('System roles cannot be deactivated')
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
  return projectRole(caller, { ...updated, abilityRules: await listRoleRules(roleId) })
}

export async function deleteRole(roleId: number, actorId: string, caller?: AuthorizationContext) {
  const role = await requireRole(roleId)
  if (caller && !caller.ability.can('delete', subject('Role', role)))
    throw new RoleNotFoundError()
  if (role.isSystem)
    throw new SystemRoleProtectedError()
  try {
    await repository.deleteRoleById(roleId, tx => recordAuditEvent({
      actorId,
      action: 'role.deleted',
      entityType: 'role',
      entityId: roleId,
      metadata: { name: role.name, slug: role.slug }
    }, tx))
  }
  catch (error) {
    const cause = typeof error === 'object' && error && 'cause' in error ? error.cause : error
    if (typeof cause === 'object' && cause && 'code' in cause && cause.code === '23514')
      throw new SoleAssignedRoleError()
    throw error
  }
}

export async function replaceRoleAbilityRules(roleId: number, abilityRuleIds: number[], caller: AuthorizationContext) {
  const role = await requireRole(roleId)
  if (role.slug === SUPER_ADMIN_SLUG) {
    const current = await listRoleRules(roleId)
    const manageAll = current.find(rule => rule.isSystem && rule.action === 'manage' && rule.subject === 'all')
    if (!manageAll || !abilityRuleIds.includes(manageAll.id))
      throw new SystemRoleProtectedError('The super admin role must keep the manage all rule')
  }
  return replaceAssignedRoleRules(roleId, abilityRuleIds, caller)
}

export async function listUsers(page: number, limit: number, search?: string, caller?: AuthorizationContext) {
  const { data, total } = await repository.findUsersWithRoles(page, limit, search, caller?.ability)
  return {
    data: caller ? data.map(user => projectSubject(caller.ability, 'User', user)) : data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  }
}

export async function getUserRoles(userId: string, caller?: AuthorizationContext) {
  const user = await repository.findUserById(userId)
  if (!user || (caller && !caller.ability.can('read', subject('User', user))))
    throw new TargetUserNotFoundError()
  return repository.findUserRoles(userId)
}

export async function replaceUserRoles(userId: string, roleIds: number[], caller: AuthorizationContext) {
  if (roleIds.length === 0)
    throw new AtLeastOneRoleRequiredError()
  const target = await repository.findUserById(userId)
  if (!target)
    throw new TargetUserNotFoundError()
  if (!caller.ability.can('update', subject('User', target)))
    throw new AbilityEscalationError()

  const uniqueIds = [...new Set(roleIds)]
  const requested = await repository.findRolesByIds(uniqueIds)
  if (requested.length !== uniqueIds.length)
    throw new UnknownRoleIdsError()

  const currentRoles = await repository.findUserRoles(userId)
  if (requested.some(role => !caller.ability.can('assign', subject('Role', role))))
    throw new AbilityEscalationError()
  const currentHasSuperAdmin = currentRoles.some(role => role.slug === SUPER_ADMIN_SLUG)
  const requestedHasSuperAdmin = requested.some(role => role.slug === SUPER_ADMIN_SLUG)
  if (currentHasSuperAdmin !== requestedHasSuperAdmin && !caller.ability.can('manage', 'all'))
    throw new SuperAdminAssignmentError()

  const replaced = await repository.replaceUserRoles(
    userId,
    uniqueIds,
    caller.user.id,
    currentHasSuperAdmin && !requestedHasSuperAdmin,
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
