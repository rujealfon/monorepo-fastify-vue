import type { Permission } from '#api/modules/roles'
import type { AdminUser, LoginUser, PatchProfile, PublicUser, RegisterUser } from './users.schema.js'

import { getRole, getRoleByName, isSuperAdminRole, PERMISSIONS } from '#api/modules/roles'

import { EmailAlreadyExistsError, ForbiddenError, UnauthorizedError, UserNotFoundError } from './users.errors.js'
import { hashPassword, verifyPassword } from './users.password.js'
import * as repository from './users.repository.js'

// the super_admin invariant lives here: its permissions are always the full catalog
function effectivePermissions(role: { isSystem: boolean, name: string }, stored: string[]) {
  return (isSuperAdminRole(role) ? [...PERMISSIONS] : stored) as Permission[]
}

function publicUser({ user: { passwordHash: _, roleId: __, ...user }, profile, role, permissions }: NonNullable<Awaited<ReturnType<typeof repository.findById>>>) {
  const { userId: ___, ...publicProfile } = profile
  return {
    ...user,
    role,
    permissions: effectivePermissions(role, permissions),
    profile: publicProfile
  } as PublicUser
}

export async function register(data: RegisterUser) {
  try {
    const { user } = await repository.insert({
      email: data.email,
      passwordHash: await hashPassword(data.password)
    })
    const created = await repository.findById(user.id)
    return publicUser(created!)
  }
  catch (error) {
    const cause = typeof error === 'object' && error && 'cause' in error ? error.cause : error
    if (typeof cause === 'object' && cause && 'code' in cause && cause.code === '23505')
      throw new EmailAlreadyExistsError()
    throw new Error('Could not create account', { cause: error })
  }
}

export async function login(data: LoginUser) {
  const user = await repository.findByEmail(data.email)
  const valid = await verifyPassword(user?.user.passwordHash, data.password)
  if (!user || !valid)
    throw new UnauthorizedError()
  return publicUser(user)
}

export async function getProfile(id: string) {
  const user = await repository.findById(id)
  if (!user)
    throw new UnauthorizedError()
  return publicUser(user)
}

export async function updateProfile(id: string, data: PatchProfile) {
  const user = await repository.updateProfile(id, data)
  if (!user)
    throw new UnauthorizedError()
  return publicUser(user)
}

export type UserAuth = {
  userId: string
  roleId: string
  roleName: string
  isSystem: boolean
  permissions: Permission[]
}

export async function getUserAuth(id: string): Promise<UserAuth | undefined> {
  const row = await repository.findAuthById(id)
  if (!row)
    return undefined
  return {
    userId: id,
    roleId: row.roleId,
    roleName: row.roleName,
    isSystem: row.isSystem,
    permissions: effectivePermissions({ isSystem: row.isSystem, name: row.roleName }, row.permissions)
  }
}

function adminUser({ user: { passwordHash: _, roleId: __, ...user }, role }: { user: NonNullable<Awaited<ReturnType<typeof repository.updateRole>>>, role: { id: string, name: string, isSystem: boolean } }) {
  return { ...user, role } as AdminUser
}

export async function listUsers(page: number, limit: number) {
  const { data, total } = await repository.findPage(page, limit)
  return {
    data: data.map(adminUser),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  }
}

export type Actor = Pick<UserAuth, 'userId' | 'roleName' | 'isSystem'>

function actorIsSuperAdmin(actor: Actor) {
  return isSuperAdminRole({ isSystem: actor.isSystem, name: actor.roleName })
}

export async function changeUserRole(actor: Actor, targetId: string, roleId: string) {
  if (actor.userId === targetId)
    throw new ForbiddenError('You cannot change your own role')

  const target = await repository.findById(targetId)
  if (!target)
    throw new UserNotFoundError()

  const newRole = await getRole(roleId)
  if ((isSuperAdminRole(newRole) || isSuperAdminRole(target.role)) && !actorIsSuperAdmin(actor))
    throw new ForbiddenError('Only super admins can manage super admin assignments')

  const updated = await repository.updateRole(targetId, roleId)
  if (!updated)
    throw new UserNotFoundError()
  return adminUser({ user: updated, role: { id: newRole.id, name: newRole.name, isSystem: newRole.isSystem } })
}

export async function deleteUser(actor: Actor, targetId: string) {
  if (actor.userId === targetId)
    throw new ForbiddenError('You cannot delete your own account')

  const target = await repository.findById(targetId)
  if (!target)
    throw new UserNotFoundError()

  if (isSuperAdminRole(target.role) && !actorIsSuperAdmin(actor))
    throw new ForbiddenError('Only super admins can delete super admin accounts')

  await repository.deleteById(targetId)
}

export async function ensureSuperAdmin(email: string, password: string) {
  const superAdminRole = await getRoleByName('super_admin')
  if (!superAdminRole)
    throw new Error('super_admin system role is missing; run migrations first')

  const existing = await repository.findByEmail(email)
  if (existing) {
    if (existing.role.name !== 'super_admin')
      await repository.updateRole(existing.user.id, superAdminRole.id)
    return
  }
  await repository.insert({
    email,
    passwordHash: await hashPassword(password),
    roleId: superAdminRole.id
  })
}
