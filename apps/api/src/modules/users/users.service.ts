import type { Actor } from './users.repository.js'
import type { LoginUser, PatchProfile, PublicUser, RegisterUser } from './users.schema.js'

import { DEFAULT_ROLE_SLUG, findRoleBySlug, getRolePermissions, SUPER_ADMIN_SLUG, UnknownRoleError } from '#api/modules/roles'

import { EmailAlreadyExistsError, ForbiddenError, UnauthorizedError, UserNotFoundError } from './users.errors.js'
import { hashPassword, verifyPassword } from './users.password.js'
import * as repository from './users.repository.js'

async function publicUser({ user: { passwordHash: _, roleId: __, ...user }, profile, role }: NonNullable<Awaited<ReturnType<typeof repository.findById>>>) {
  const { userId: ___, ...publicProfile } = profile
  const permissions = await getRolePermissions(role.id)
  return { ...user, profile: publicProfile, role, permissions } as PublicUser
}

async function requireRole(slug: string) {
  const role = await findRoleBySlug(slug)
  if (!role)
    throw new Error(`Role "${slug}" is missing; run database migrations first`)
  return role
}

export async function register(data: RegisterUser) {
  const role = await requireRole(DEFAULT_ROLE_SLUG)
  try {
    return await publicUser(await repository.insert({
      email: data.email,
      passwordHash: await hashPassword(data.password),
      roleId: role.id
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

export async function listUsers(page: number, limit: number) {
  const { data, total } = await repository.findPage(page, limit)
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function changeUserRole(actor: Actor, targetId: string, roleSlug: string) {
  const newRole = await findRoleBySlug(roleSlug)
  if (!newRole)
    throw new UnknownRoleError()
  if (targetId === actor.id)
    throw new ForbiddenError()
  const target = await repository.findWithRole(targetId)
  if (!target)
    throw new UserNotFoundError()
  const manageAll = actor.ability.can('manage', 'all')
  if (!manageAll && !(actor.role.rank > target.role.rank && actor.role.rank > newRole.rank))
    throw new ForbiddenError()
  const updated = await repository.updateRole(targetId, newRole.id)
  if (!updated)
    throw new UserNotFoundError()
  return updated
}

export async function deleteUser(actor: Actor, targetId: string) {
  if (targetId === actor.id)
    throw new ForbiddenError()
  const target = await repository.findWithRole(targetId)
  if (!target)
    throw new UserNotFoundError()
  if (!actor.ability.can('manage', 'all') && !(actor.role.rank > target.role.rank))
    throw new ForbiddenError()
  await repository.deleteById(targetId)
}

export async function ensureSuperAdmin(email: string, password: string) {
  const role = await requireRole(SUPER_ADMIN_SLUG)
  const existing = await repository.findByEmail(email)
  if (existing) {
    await repository.updateRole(existing.user.id, role.id)
    return getProfile(existing.user.id)
  }
  return publicUser(await repository.insert({
    email,
    passwordHash: await hashPassword(password),
    roleId: role.id
  }))
}
