import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getRole, getRoleByName, PERMISSIONS } from '#api/modules/roles'
import { EmailAlreadyExistsError, ForbiddenError, UnauthorizedError, UserNotFoundError } from '#api/modules/users/users.errors.js'
import * as usersPassword from '#api/modules/users/users.password.js'
import * as usersRepository from '#api/modules/users/users.repository.js'
import * as usersService from '#api/modules/users/users.service.js'

vi.mock('#api/modules/users/users.repository.js')
vi.mock('#api/modules/users/users.password.js')
vi.mock('#api/modules/roles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#api/modules/roles')>()
  return { ...actual, getRole: vi.fn(), getRoleByName: vi.fn() }
})

const userRole = { id: 'role-user', name: 'user', isSystem: true }
const superAdminRole = { id: 'role-super', name: 'super_admin', isSystem: true }

const sampleUser = {
  id: '1',
  email: 'person@example.com',
  passwordHash: 'hash',
  roleId: userRole.id,
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

const sampleRow = { user: sampleUser, profile: sampleProfile, role: userRole, permissions: [] as string[] }

const actorUser = { userId: 'actor', roleName: 'user', isSystem: true }
const actorAdmin = { userId: 'actor', roleName: 'admin', isSystem: true }
const actorSuper = { userId: 'actor', roleName: 'super_admin', isSystem: true }

describe('users.service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('register hashes the password, defaults the role and returns the public user', async () => {
    vi.mocked(usersPassword.hashPassword).mockResolvedValue('hashed')
    vi.mocked(usersRepository.insert).mockResolvedValue({ user: sampleUser, profile: sampleProfile })
    vi.mocked(usersRepository.findById).mockResolvedValue(sampleRow)

    const user = await usersService.register({ email: 'person@example.com', password: 'correct horse battery staple' })

    expect(usersPassword.hashPassword).toHaveBeenCalledWith('correct horse battery staple')
    expect(usersRepository.insert).toHaveBeenCalledWith({ email: 'person@example.com', passwordHash: 'hashed' })
    expect(vi.mocked(usersRepository.insert).mock.calls[0][0]).not.toHaveProperty('roleId')
    expect(user).not.toHaveProperty('passwordHash')
    expect(user).not.toHaveProperty('roleId')
    expect(user.role).toEqual(userRole)
    expect(user.permissions).toEqual([])
    expect(user.profile).not.toHaveProperty('userId')
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
    expect(user.role).toEqual(userRole)
    expect(user).not.toHaveProperty('passwordHash')
  })

  it('getProfile throws UnauthorizedError when the account is missing', async () => {
    vi.mocked(usersRepository.findById).mockResolvedValue(undefined)

    await expect(usersService.getProfile('missing')).rejects.toThrow(UnauthorizedError)
  })

  it('getUserAuth passes stored permissions through for normal roles', async () => {
    vi.mocked(usersRepository.findAuthById).mockResolvedValue({
      roleId: userRole.id,
      roleName: 'user',
      isSystem: true,
      permissions: ['users:read']
    })

    await expect(usersService.getUserAuth('1')).resolves.toMatchObject({
      userId: '1',
      roleName: 'user',
      permissions: ['users:read']
    })
  })

  it('getUserAuth always grants the full catalog to super admins', async () => {
    vi.mocked(usersRepository.findAuthById).mockResolvedValue({
      roleId: superAdminRole.id,
      roleName: 'super_admin',
      isSystem: true,
      permissions: []
    })

    const auth = await usersService.getUserAuth('1')
    expect(auth?.permissions).toEqual([...PERMISSIONS])
  })

  it('changeUserRole blocks self-changes and missing targets', async () => {
    await expect(usersService.changeUserRole({ ...actorSuper, userId: '1' }, '1', 'role-x'))
      .rejects
      .toThrow(ForbiddenError)

    vi.mocked(usersRepository.findById).mockResolvedValue(undefined)
    await expect(usersService.changeUserRole(actorSuper, 'missing', 'role-x'))
      .rejects
      .toThrow(UserNotFoundError)
  })

  it('changeUserRole lets only super admins touch super admin assignments', async () => {
    vi.mocked(usersRepository.findById).mockResolvedValue(sampleRow)
    vi.mocked(getRole).mockResolvedValue({ ...superAdminRole, description: null, createdAt: new Date(), updatedAt: new Date(), permissions: [], userCount: 0 })

    await expect(usersService.changeUserRole(actorAdmin, '1', superAdminRole.id))
      .rejects
      .toThrow(ForbiddenError)

    vi.mocked(usersRepository.findById).mockResolvedValue({ ...sampleRow, role: superAdminRole })
    vi.mocked(getRole).mockResolvedValue({ ...userRole, description: null, createdAt: new Date(), updatedAt: new Date(), permissions: [], userCount: 0 })

    await expect(usersService.changeUserRole(actorAdmin, '1', userRole.id))
      .rejects
      .toThrow(ForbiddenError)
  })

  it('changeUserRole assigns roles when permitted', async () => {
    vi.mocked(usersRepository.findById).mockResolvedValue(sampleRow)
    vi.mocked(getRole).mockResolvedValue({ id: 'role-support', name: 'support', isSystem: false, description: null, createdAt: new Date(), updatedAt: new Date(), permissions: ['users:read'], userCount: 0 })
    vi.mocked(usersRepository.updateRole).mockResolvedValue({ ...sampleUser, roleId: 'role-support' })

    const updated = await usersService.changeUserRole(actorAdmin, '1', 'role-support')
    expect(usersRepository.updateRole).toHaveBeenCalledWith('1', 'role-support')
    expect(updated.role).toEqual({ id: 'role-support', name: 'support', isSystem: false })
  })

  it('deleteUser applies self and super admin protections', async () => {
    await expect(usersService.deleteUser({ ...actorUser, userId: '1' }, '1')).rejects.toThrow(ForbiddenError)

    vi.mocked(usersRepository.findById).mockResolvedValue({ ...sampleRow, role: superAdminRole })
    await expect(usersService.deleteUser(actorAdmin, '1')).rejects.toThrow(ForbiddenError)

    vi.mocked(usersRepository.findById).mockResolvedValue(sampleRow)
    await usersService.deleteUser(actorAdmin, '1')
    expect(usersRepository.deleteById).toHaveBeenCalledWith('1')
  })

  it('ensureSuperAdmin creates the account with the super_admin role when missing', async () => {
    vi.mocked(getRoleByName).mockResolvedValue({ ...superAdminRole, description: null, createdAt: new Date(), updatedAt: new Date() })
    vi.mocked(usersRepository.findByEmail).mockResolvedValue(undefined)
    vi.mocked(usersPassword.hashPassword).mockResolvedValue('hashed')

    await usersService.ensureSuperAdmin('root@example.com', 'correct horse battery staple')

    expect(usersRepository.insert).toHaveBeenCalledWith({
      email: 'root@example.com',
      passwordHash: 'hashed',
      roleId: superAdminRole.id
    })
    expect(usersRepository.updateRole).not.toHaveBeenCalled()
  })

  it('ensureSuperAdmin promotes an existing account without touching the password', async () => {
    vi.mocked(getRoleByName).mockResolvedValue({ ...superAdminRole, description: null, createdAt: new Date(), updatedAt: new Date() })
    vi.mocked(usersRepository.findByEmail).mockResolvedValue(sampleRow)

    await usersService.ensureSuperAdmin('person@example.com', 'ignored password here')

    expect(usersRepository.updateRole).toHaveBeenCalledWith('1', superAdminRole.id)
    expect(usersRepository.insert).not.toHaveBeenCalled()
    expect(usersPassword.hashPassword).not.toHaveBeenCalled()
  })

  it('ensureSuperAdmin is a no-op when the account already holds the role', async () => {
    vi.mocked(getRoleByName).mockResolvedValue({ ...superAdminRole, description: null, createdAt: new Date(), updatedAt: new Date() })
    vi.mocked(usersRepository.findByEmail).mockResolvedValue({ ...sampleRow, role: superAdminRole })

    await usersService.ensureSuperAdmin('person@example.com', 'ignored password here')

    expect(usersRepository.updateRole).not.toHaveBeenCalled()
    expect(usersRepository.insert).not.toHaveBeenCalled()
  })
})
