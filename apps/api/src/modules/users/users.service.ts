import type { LoginUser, PatchProfile, PublicUser, RegisterUser } from './users.schema.js'

import { recordAuditEvent } from '#api/modules/audit-logs'

import { EmailAlreadyExistsError, UnauthorizedError } from './users.errors.js'
import { hashPassword, verifyPassword } from './users.password.js'
import * as repository from './users.repository.js'

function publicUser({ user: { passwordHash: _, ...user }, profile }: NonNullable<Awaited<ReturnType<typeof repository.findById>>>) {
  const { userId: __, ...publicProfile } = profile
  return { ...user, profile: publicProfile } as PublicUser
}

export async function register(data: RegisterUser) {
  try {
    const user = publicUser(await repository.insert({
      email: data.email,
      passwordHash: await hashPassword(data.password)
    }))
    await recordAuditEvent({
      actorId: user.id,
      action: 'user.registered',
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email }
    })
    return user
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
  if (!user || !valid) {
    await recordAuditEvent({
      actorId: user?.user.id ?? null,
      action: 'auth.login_failed',
      entityType: 'user',
      entityId: user?.user.id ?? data.email,
      metadata: { email: data.email }
    })
    throw new UnauthorizedError()
  }
  await recordAuditEvent({
    actorId: user.user.id,
    action: 'auth.login',
    entityType: 'user',
    entityId: user.user.id
  })
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
  await recordAuditEvent({
    actorId: id,
    action: 'profile.updated',
    entityType: 'user',
    entityId: id,
    metadata: { changedFields: Object.keys(data) }
  })
  return publicUser(user)
}
