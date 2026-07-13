import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as rolesModule from '#api/modules/roles'
import { EmailAlreadyExistsError, UnauthorizedError } from '#api/modules/users/users.errors.js'
import * as usersPassword from '#api/modules/users/users.password.js'
import * as usersRepository from '#api/modules/users/users.repository.js'
import * as usersService from '#api/modules/users/users.service.js'

vi.mock('#api/modules/roles')
vi.mock('#api/modules/users/users.repository.js')
vi.mock('#api/modules/users/users.password.js')

const sampleRole = {
  id: 'role-1',
  name: 'Standard User',
  slug: 'user',
  rank: 10,
  isSystem: true,
  createdAt: new Date(),
  updatedAt: new Date()
}

const sampleUser = {
  id: '1',
  email: 'person@example.com',
  passwordHash: 'hash',
  roleId: sampleRole.id,
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

const sampleRow = {
  user: sampleUser,
  profile: sampleProfile,
  role: { id: sampleRole.id, slug: sampleRole.slug, name: sampleRole.name, rank: sampleRole.rank }
}

describe('users.service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(rolesModule.findRoleBySlug).mockResolvedValue(sampleRole)
    vi.mocked(rolesModule.getRolePermissions).mockResolvedValue([])
  })

  it('register hashes the password and returns the public user', async () => {
    vi.mocked(usersPassword.hashPassword).mockResolvedValue('hashed')
    vi.mocked(usersRepository.insert).mockResolvedValue(sampleRow)

    const user = await usersService.register({ email: 'person@example.com', password: 'correct horse battery staple' })

    expect(usersPassword.hashPassword).toHaveBeenCalledWith('correct horse battery staple')
    expect(usersRepository.insert).toHaveBeenCalledWith({ email: 'person@example.com', passwordHash: 'hashed', roleId: sampleRole.id })
    expect(user).not.toHaveProperty('passwordHash')
    expect(user.profile).not.toHaveProperty('userId')
    expect(user.role).toMatchObject({ slug: 'user' })
    expect(user.permissions).toEqual([])
  })

  it('register maps a unique-violation cause to EmailAlreadyExistsError', async () => {
    vi.mocked(usersPassword.hashPassword).mockResolvedValue('hashed')
    vi.mocked(usersRepository.insert).mockRejectedValue(new Error('duplicate', { cause: { code: '23505' } }))

    await expect(usersService.register({ email: 'person@example.com', password: 'correct horse battery staple' }))
      .rejects
      .toThrow(EmailAlreadyExistsError)
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
})
