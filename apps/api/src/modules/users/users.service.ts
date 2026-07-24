import type { AuthorizationContext } from '#api/modules/authorization'
import type { LoginUser, PatchProfile, PublicUser, RegisterUser } from './users.schema.js'

import { recordAuditEvent } from '#api/modules/audit-logs'
import { AUTHORIZATION_CATALOG, InsufficientAbilityError, subject } from '#api/modules/authorization'

import { EmailAlreadyExistsError, UnauthorizedError } from './users.errors.js'
import { hashPassword, verifyPassword } from './users.password.js'
import * as repository from './users.repository.js'

function publicUser({ user: { passwordHash: _, ...user }, profile }: NonNullable<Awaited<ReturnType<typeof repository.findById>>>) {
  const { userId: __, ...publicProfile } = profile
  return { ...user, profile: publicProfile } as PublicUser
}

function projectProfile(caller: AuthorizationContext, value: PublicUser) {
  const tagged = subject('Profile', { userId: value.id, ...value.profile })
  return {
    ...value,
    profile: Object.fromEntries(AUTHORIZATION_CATALOG.Profile.readableFields
      .filter(field => field !== 'userId' && caller.ability.can('read', tagged, field))
      .map(field => [field, value.profile[field as keyof PublicUser['profile']]]))
  }
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

export async function getProfile(caller: AuthorizationContext | string) {
  const id = typeof caller === 'string' ? caller : caller.user.id
  const user = await repository.findById(id)
  if (!user)
    throw new UnauthorizedError()
  if (typeof caller !== 'string' && !caller.ability.can('read', subject('Profile', user.profile)))
    throw new InsufficientAbilityError()
  return typeof caller === 'string' ? publicUser(user) : projectProfile(caller, publicUser(user))
}

export async function updateProfile(caller: AuthorizationContext | string, data: PatchProfile) {
  if (typeof caller === 'string') {
    const user = await repository.updateProfile(caller, data, tx => recordAuditEvent({
      actorId: caller,
      action: 'profile.updated',
      entityType: 'user',
      entityId: caller,
      metadata: { changedFields: Object.keys(data) }
    }, tx))
    if (!user)
      throw new UnauthorizedError()
    return publicUser(user)
  }
  const id = caller.user.id
  const current = await repository.findById(id)
  if (!current)
    throw new UnauthorizedError()
  const profile = subject('Profile', current.profile)
  if (!caller.ability.can('update', profile)
    || Object.keys(data).some(field => !caller.ability.can('update', profile, field))) {
    throw new InsufficientAbilityError()
  }
  const user = await repository.updateProfile(id, data, tx => recordAuditEvent({
    actorId: id,
    action: 'profile.updated',
    entityType: 'user',
    entityId: id,
    metadata: { changedFields: Object.keys(data) }
  }, tx))
  if (!user)
    throw new UnauthorizedError()
  return projectProfile(caller, publicUser(user))
}
