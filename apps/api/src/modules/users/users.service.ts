import type { AdminUser, LoginUser, PatchProfile, PublicUser, RegisterUser, Role } from './users.schema.js'

import { EmailAlreadyExistsError, ForbiddenError, UnauthorizedError, UserNotFoundError } from './users.errors.js'
import { hashPassword, verifyPassword } from './users.password.js'
import * as repository from './users.repository.js'
import { outranks } from './users.roles.js'

function publicUser({ user: { passwordHash: _, ...user }, profile }: NonNullable<Awaited<ReturnType<typeof repository.findById>>>) {
  const { userId: __, ...publicProfile } = profile
  return { ...user, profile: publicProfile } as PublicUser
}

export async function register(data: RegisterUser) {
  try {
    return publicUser(await repository.insert({
      email: data.email,
      passwordHash: await hashPassword(data.password)
    }))
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

function adminUser({ passwordHash: _, ...user }: NonNullable<Awaited<ReturnType<typeof repository.updateRole>>>) {
  return user as AdminUser
}

export function getUserRole(id: string) {
  return repository.findRoleById(id)
}

export async function listUsers(page: number, limit: number) {
  const { data, total } = await repository.findPage(page, limit)
  return {
    data: data.map(adminUser),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  }
}

export type Actor = { id: string, role: Role }

export async function changeUserRole(actor: Actor, targetId: string, newRole: Role) {
  if (actor.id === targetId)
    throw new ForbiddenError('You cannot change your own role')

  const target = await repository.findById(targetId)
  if (!target)
    throw new UserNotFoundError()

  const allowed = actor.role === 'super_admin'
    || (outranks(actor.role, target.user.role) && outranks(actor.role, newRole))
  if (!allowed)
    throw new ForbiddenError()

  const updated = await repository.updateRole(targetId, newRole)
  if (!updated)
    throw new UserNotFoundError()
  return adminUser(updated)
}

export async function deleteUser(actor: Actor, targetId: string) {
  if (actor.id === targetId)
    throw new ForbiddenError('You cannot delete your own account')

  const target = await repository.findById(targetId)
  if (!target)
    throw new UserNotFoundError()

  if (actor.role !== 'super_admin' && !outranks(actor.role, target.user.role))
    throw new ForbiddenError()

  await repository.deleteById(targetId)
}

export async function ensureSuperAdmin(email: string, password: string) {
  const existing = await repository.findByEmail(email)
  if (existing) {
    if (existing.user.role !== 'super_admin')
      await repository.updateRole(existing.user.id, 'super_admin')
    return
  }
  await repository.insert({
    email,
    passwordHash: await hashPassword(password),
    role: 'super_admin'
  })
}
