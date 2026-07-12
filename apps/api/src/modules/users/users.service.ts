import type { LoginUser, PatchProfile, PublicUser, RegisterUser } from './users.schema.js'

import { EmailAlreadyExistsError, UnauthorizedError } from './users.errors.js'
import { hashPassword, verifyPassword } from './users.password.js'
import * as repository from './users.repository.js'

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
