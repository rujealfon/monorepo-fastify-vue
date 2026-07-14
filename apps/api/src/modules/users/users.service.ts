import type { CreateRole, LoginUser, PatchProfile, PatchRole, PublicUser, RegisterUser, ReplaceUserRoles } from './users.schema.js'

import { EmailAlreadyExistsError, ForbiddenError, PermissionNotFoundError, RoleConflictError, RoleNotFoundError, UnauthorizedError, UserNotFoundError } from './users.errors.js'
import { hashPassword, verifyPassword } from './users.password.js'
import * as repository from './users.repository.js'

function publicUser({ user: { passwordHash: _, ...user }, profile, roles, permissions }: NonNullable<Awaited<ReturnType<typeof repository.findById>>>) {
  const { userId: __, ...publicProfile } = profile
  return { ...user, profile: publicProfile, roles, permissions } as PublicUser
}

function cause(error: unknown) {
  return typeof error === 'object' && error && 'cause' in error ? error.cause : error
}

function hasCode(error: unknown, code: string) {
  const value = cause(error)
  return typeof value === 'object' && value && 'code' in value && value.code === code
}

export async function register(data: RegisterUser) {
  try {
    return publicUser(await repository.insert({
      email: data.email,
      passwordHash: await hashPassword(data.password)
    }))
  }
  catch (error) {
    if (hasCode(error, '23505'))
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

export function hasPermission(id: string, permission: Parameters<typeof repository.hasPermission>[1]) {
  return repository.hasPermission(id, permission)
}

export function listUsers(page: number, limit: number) {
  return repository.listUsers(page, limit)
}

export async function replaceUserRoles(actorId: string, userId: string, data: ReplaceUserRoles) {
  if (actorId === userId)
    throw new ForbiddenError('You cannot change your own roles')

  const result = await repository.replaceUserRoles(userId, data.roleIds)
  if (result === 'missing-user')
    throw new UserNotFoundError()
  if (result === 'missing-role')
    throw new RoleNotFoundError()
  if (result === 'last-admin')
    throw new RoleConflictError('The final admin assignment cannot be removed')
  return repository.findManagedUser(userId).then(user => user!)
}

export function listPermissions() {
  return repository.listPermissions()
}

export function listRoles() {
  return repository.listRoles()
}

export async function createRole(data: CreateRole) {
  try {
    const role = await repository.createRole(data)
    if (role === 'missing-permission')
      throw new PermissionNotFoundError()
    return role
  }
  catch (error) {
    if (error instanceof PermissionNotFoundError)
      throw error
    if (hasCode(error, '23505'))
      throw new RoleConflictError('A role with that name already exists')
    throw error
  }
}

export async function updateRole(id: string, data: PatchRole) {
  try {
    const role = await repository.updateRole(id, data)
    if (role === 'missing-role')
      throw new RoleNotFoundError()
    if (role === 'missing-permission')
      throw new PermissionNotFoundError()
    if (role === 'protected-role')
      throw new ForbiddenError('This system role cannot be changed that way')
    return role
  }
  catch (error) {
    if (error instanceof RoleNotFoundError || error instanceof PermissionNotFoundError || error instanceof ForbiddenError)
      throw error
    if (hasCode(error, '23505'))
      throw new RoleConflictError('A role with that name already exists')
    throw error
  }
}

export async function deleteRole(id: string) {
  const result = await repository.deleteRole(id)
  if (result === 'missing-role')
    throw new RoleNotFoundError()
  if (result === 'protected-role')
    throw new ForbiddenError('System roles cannot be deleted')
  if (result === 'role-assigned')
    throw new RoleConflictError('Remove this role from all users before deleting it')
}

export async function promoteByEmail(email: string) {
  if (!await repository.promoteByEmail(email))
    throw new UserNotFoundError()
}
