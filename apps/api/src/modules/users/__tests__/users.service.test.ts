import type { Redis } from 'ioredis'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { config } from '#api/config/index.js'
import { UnauthorizedError } from '#api/modules/users/users.errors.js'
import * as usersPassword from '#api/modules/users/users.password.js'
import * as usersRepository from '#api/modules/users/users.repository.js'
import * as usersService from '#api/modules/users/users.service.js'

vi.mock('#api/modules/users/users.repository.js')
vi.mock('#api/modules/users/users.password.js')

// A minimal in-memory stand-in for the one ioredis method pair mintHandoffToken/
// redeemHandoffToken use, so these tests don't depend on a real Redis connection.
function createFakeRedis() {
  const store = new Map<string, string>()
  return {
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value)
      return 'OK'
    }),
    getdel: vi.fn(async (key: string) => {
      const value = store.get(key) ?? null
      // eslint-disable-next-line drizzle/enforce-delete-with-where -- plain in-memory Map, not a Drizzle table
      store.delete(key)
      return value
    })
  } as unknown as Redis
}

const sampleUser = {
  id: '1',
  email: 'person@example.com',
  passwordHash: 'hash',
  createdAt: new Date(),
  updatedAt: new Date()
}

const sampleProfile = {
  userId: '1',
  firstName: null,
  lastName: null,
  gender: null,
  birthDate: null,
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date()
}

const sampleRow = { user: sampleUser, profile: sampleProfile }

describe('users.service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('register hashes the password and returns the public user', async () => {
    vi.mocked(usersPassword.hashPassword).mockResolvedValue('hashed')
    vi.mocked(usersRepository.insert).mockResolvedValue(sampleRow)

    const user = await usersService.register({ email: 'person@example.com', password: 'correct horse battery staple' })

    expect(usersPassword.hashPassword).toHaveBeenCalledWith('correct horse battery staple')
    expect(usersRepository.insert).toHaveBeenCalledWith({ email: 'person@example.com', passwordHash: 'hashed' })
    expect(user).toMatchObject({ email: 'person@example.com' })
    expect(user).not.toHaveProperty('passwordHash')
    expect(user).not.toHaveProperty('profile.userId')
  })

  it('register treats a duplicate email like an accepted registration request', async () => {
    vi.mocked(usersPassword.hashPassword).mockResolvedValue('hashed')
    vi.mocked(usersRepository.insert).mockRejectedValue(new Error('duplicate', { cause: { code: '23505' } }))

    await expect(usersService.register({ email: 'person@example.com', password: 'correct horse battery staple' }))
      .resolves
      .toBeUndefined()
  })

  it('register preserves the original error as the cause for unexpected failures', async () => {
    vi.mocked(usersPassword.hashPassword).mockResolvedValue('hashed')
    const dbError = new Error('connection lost')
    vi.mocked(usersRepository.insert).mockRejectedValue(dbError)

    await expect(usersService.register({ email: 'person@example.com', password: 'correct horse battery staple' }))
      .rejects
      .toMatchObject({ message: 'Could not create account', cause: dbError })
  })

  it('login runs password verification even when no account exists', async () => {
    vi.mocked(usersRepository.findByEmail).mockResolvedValue(undefined)
    vi.mocked(usersPassword.verifyPassword).mockResolvedValue(false)

    await expect(usersService.login({ email: 'nobody@example.com', password: 'whatever whatever' }))
      .rejects
      .toThrow(UnauthorizedError)
    expect(usersPassword.verifyPassword).toHaveBeenCalledWith(undefined, 'whatever whatever')
  })

  it('login rejects an incorrect password for an existing account', async () => {
    vi.mocked(usersRepository.findByEmail).mockResolvedValue(sampleRow)
    vi.mocked(usersPassword.verifyPassword).mockResolvedValue(false)

    await expect(usersService.login({ email: 'person@example.com', password: 'wrong password' }))
      .rejects
      .toThrow(UnauthorizedError)
  })

  it('login returns the public user on success', async () => {
    vi.mocked(usersRepository.findByEmail).mockResolvedValue(sampleRow)
    vi.mocked(usersPassword.verifyPassword).mockResolvedValue(true)

    const user = await usersService.login({ email: 'person@example.com', password: 'correct horse battery staple' })
    expect(user.id).toBe('1')
    expect(user).not.toHaveProperty('passwordHash')
  })

  it('getProfile throws UnauthorizedError when the account is missing', async () => {
    vi.mocked(usersRepository.findById).mockResolvedValue(undefined)

    await expect(usersService.getProfile('missing')).rejects.toThrow(UnauthorizedError)
  })

  it('getProfile returns the public user', async () => {
    vi.mocked(usersRepository.findById).mockResolvedValue(sampleRow)

    await expect(usersService.getProfile('1')).resolves.toMatchObject({ id: '1' })
  })

  it('updateProfile throws UnauthorizedError when the account is missing', async () => {
    vi.mocked(usersRepository.updateProfile).mockResolvedValue(undefined)

    await expect(usersService.updateProfile('missing', { firstName: 'Alex' })).rejects.toThrow(UnauthorizedError)
  })

  it('updateProfile returns the public user', async () => {
    vi.mocked(usersRepository.updateProfile).mockResolvedValue(sampleRow)

    await expect(usersService.updateProfile('1', { firstName: 'Alex' })).resolves.toMatchObject({ id: '1' })
  })

  it('mintHandoffToken stores the user id under the configured TTL and returns an opaque token', async () => {
    const redis = createFakeRedis()

    const token = await usersService.mintHandoffToken(redis, 'user-1')

    expect(token).toMatch(/^[\w-]+$/)
    expect(redis.set).toHaveBeenCalledWith(`handoff:${token}`, 'user-1', 'EX', config.HANDOFF_TOKEN_TTL_SECONDS)
  })

  it('redeemHandoffToken returns the user id for a valid token and consumes it', async () => {
    const redis = createFakeRedis()
    const token = await usersService.mintHandoffToken(redis, 'user-1')

    await expect(usersService.redeemHandoffToken(redis, token)).resolves.toBe('user-1')
    // Single-use: a second redemption of the same token must fail.
    await expect(usersService.redeemHandoffToken(redis, token)).resolves.toBeNull()
  })

  it('redeemHandoffToken returns null for an unknown token', async () => {
    const redis = createFakeRedis()

    await expect(usersService.redeemHandoffToken(redis, 'does-not-exist')).resolves.toBeNull()
  })
})
