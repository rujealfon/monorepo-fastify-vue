import type { AppRawRule, AuthorizationContext } from '#api/modules/authorization'

import { createMongoAbility } from '@casl/ability'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as authorization from '#api/modules/authorization'
import {
  AbilityEscalationError,
  AtLeastOneRoleRequiredError,
  LastSuperAdminError,
  RoleSlugTakenError,
  SoleAssignedRoleError,
  SystemRoleProtectedError,
  UnknownRoleIdsError
} from '#api/modules/roles/roles.errors.js'
import * as repository from '#api/modules/roles/roles.repository.js'
import * as service from '#api/modules/roles/roles.service.js'

vi.mock('#api/modules/authorization', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#api/modules/authorization')>()
  return { ...actual, listRoleRules: vi.fn() }
})
vi.mock('#api/modules/roles/roles.repository.js')
vi.mock('#api/modules/audit-logs')

const now = new Date()
const target = { id: 'target-id', email: 'target@example.com', createdAt: now, updatedAt: now }
const standardRole = {
  id: 3,
  name: 'Standard User',
  slug: 'standard-user',
  description: null,
  isSystem: true,
  isActive: true,
  createdAt: now,
  updatedAt: now
}
const superAdminRole = { ...standardRole, id: 1, name: 'Super Admin', slug: 'super-admin' }
const adminRole = { ...standardRole, id: 2, name: 'Admin', slug: 'admin' }
const protectedRole = { ...standardRole, id: 4, name: 'Protected', slug: 'protected', isSystem: false }
const manageAllRule = {
  id: 1,
  key: 'system.manage_all',
  description: 'Full system access',
  effect: 'allow' as const,
  action: 'manage' as const,
  subject: 'all' as const,
  fields: null,
  actorConditions: null,
  resourceConditions: null,
  denialReason: null,
  priority: 1_000_000,
  isSystem: true,
  isActive: true,
  conditionSchemaVersion: 1,
  createdAt: now,
  updatedAt: now
}

function caller(rules: AppRawRule[]): AuthorizationContext {
  const ability = createMongoAbility<AuthorizationContext['ability']>(rules)
  return {
    user: { id: 'caller-id', email: 'caller@example.com' },
    roles: [],
    rules: rules as AuthorizationContext['rules'],
    ability: ability as AuthorizationContext['ability'],
    authorizationVersion: 1
  }
}

describe('roles service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(authorization.listRoleRules).mockResolvedValue([])
  })

  it('maps duplicate role slugs and protects system roles', async () => {
    vi.mocked(repository.insertRole).mockRejectedValue(new Error('insert failed', { cause: { code: '23505' } }))
    await expect(service.createRole({ name: 'Support', slug: 'support' }, 'caller-id')).rejects.toBeInstanceOf(RoleSlugTakenError)

    vi.mocked(repository.findRoleById).mockResolvedValueOnce(standardRole).mockResolvedValueOnce(superAdminRole)
    await expect(service.updateRole(3, { isActive: false }, 'caller-id')).rejects.toBeInstanceOf(SystemRoleProtectedError)
    await expect(service.deleteRole(1, 'caller-id')).rejects.toBeInstanceOf(SystemRoleProtectedError)
  })

  it('maps the final-role database constraint when deleting a role', async () => {
    vi.mocked(repository.findRoleById).mockResolvedValue({ ...standardRole, id: 4, isSystem: false, slug: 'custom' })
    vi.mocked(repository.deleteRoleById).mockRejectedValue(
      new Error('delete failed', { cause: { code: '23514', constraint: 'users_require_role' } })
    )

    await expect(service.deleteRole(4, 'caller-id')).rejects.toBeInstanceOf(SoleAssignedRoleError)
  })

  it('requires manage all to delete a role carrying manage all', async () => {
    vi.mocked(repository.findRoleById).mockResolvedValue(protectedRole)
    vi.mocked(authorization.listRoleRules).mockResolvedValue([manageAllRule])

    await expect(service.deleteRole(protectedRole.id, 'caller-id', caller([
      { action: 'delete', subject: 'Role' }
    ]))).rejects.toBeInstanceOf(SystemRoleProtectedError)
    expect(repository.deleteRoleById).not.toHaveBeenCalled()
  })

  it('allows a manage-all caller to delete a custom manage-all role', async () => {
    vi.mocked(repository.findRoleById).mockResolvedValue(protectedRole)
    vi.mocked(authorization.listRoleRules).mockResolvedValue([manageAllRule])

    await expect(service.deleteRole(protectedRole.id, 'caller-id', caller([
      { action: 'manage', subject: 'all' }
    ]))).resolves.toBeUndefined()
    expect(repository.deleteRoleById).toHaveBeenCalledWith(protectedRole.id, expect.any(Function))
  })

  it('requires update User and assign on every target Role instance', async () => {
    vi.mocked(repository.findUserById).mockResolvedValue(target)
    vi.mocked(repository.findRolesByIds).mockResolvedValue([standardRole])
    vi.mocked(repository.findUserRoles).mockResolvedValue([])

    await expect(service.replaceUserRoles('target-id', [3], caller([
      { action: 'update', subject: 'User' }
    ]))).rejects.toBeInstanceOf(AbilityEscalationError)

    await expect(service.replaceUserRoles('target-id', [3], caller([
      { action: 'assign', subject: 'Role' }
    ]))).rejects.toBeInstanceOf(AbilityEscalationError)
  })

  it('requires assign ability for roles removed by a replacement', async () => {
    vi.mocked(repository.findUserById).mockResolvedValue(target)
    vi.mocked(repository.findRolesByIds).mockResolvedValue([standardRole])
    vi.mocked(repository.findUserRoles)
      .mockResolvedValueOnce([protectedRole])
      .mockResolvedValueOnce([standardRole])
    vi.mocked(repository.replaceUserRoles).mockResolvedValue(true)

    await expect(service.replaceUserRoles('target-id', [standardRole.id], caller([
      { action: 'update', subject: 'User' },
      { action: 'assign', subject: 'Role', conditions: { slug: 'standard-user' } }
    ]))).rejects.toBeInstanceOf(AbilityEscalationError)
    expect(repository.replaceUserRoles).not.toHaveBeenCalled()
  })

  it('allows removing a role within the caller assign ability', async () => {
    vi.mocked(repository.findUserById).mockResolvedValue(target)
    vi.mocked(repository.findRolesByIds).mockResolvedValue([standardRole])
    vi.mocked(repository.findUserRoles)
      .mockResolvedValueOnce([adminRole])
      .mockResolvedValueOnce([standardRole])
    vi.mocked(repository.replaceUserRoles).mockResolvedValue(true)

    await expect(service.replaceUserRoles('target-id', [standardRole.id], caller([
      { action: 'update', subject: 'User' },
      { action: 'assign', subject: 'Role', conditions: { slug: { $in: ['admin', 'standard-user'] } } }
    ]))).resolves.toEqual([standardRole])
  })

  it('requires at least one role', async () => {
    await expect(service.replaceUserRoles('target-id', [], caller([
      { action: 'manage', subject: 'all' }
    ]))).rejects.toBeInstanceOf(AtLeastOneRoleRequiredError)
    expect(repository.findUserById).not.toHaveBeenCalled()
  })

  it('rejects unknown roles after authorizing the target user', async () => {
    vi.mocked(repository.findUserById).mockResolvedValue(target)
    vi.mocked(repository.findRolesByIds).mockResolvedValue([])
    await expect(service.replaceUserRoles('target-id', [999], caller([
      { action: 'update', subject: 'User' },
      { action: 'assign', subject: 'Role' }
    ]))).rejects.toBeInstanceOf(UnknownRoleIdsError)
  })

  it('preserves the final super admin and replaces normal assignments atomically', async () => {
    const administrator = caller([{ action: 'manage', subject: 'all' }])
    vi.mocked(repository.findUserById).mockResolvedValue(target)
    vi.mocked(repository.findRolesByIds).mockResolvedValue([standardRole])
    vi.mocked(repository.findUserRoles).mockResolvedValueOnce([superAdminRole])
    vi.mocked(repository.replaceUserRoles).mockResolvedValueOnce(false)
    await expect(service.replaceUserRoles('target-id', [3], administrator)).rejects.toBeInstanceOf(LastSuperAdminError)

    vi.mocked(repository.findUserRoles)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([standardRole])
    vi.mocked(repository.replaceUserRoles).mockResolvedValueOnce(true)
    await expect(service.replaceUserRoles('target-id', [3], administrator)).resolves.toEqual([standardRole])
    expect(repository.replaceUserRoles).toHaveBeenLastCalledWith('target-id', [3], 'caller-id', false, expect.any(Function))
  })

  it('deduplicates role ids before lookup and persistence', async () => {
    const administrator = caller([{ action: 'manage', subject: 'all' }])
    vi.mocked(repository.findUserById).mockResolvedValue(target)
    vi.mocked(repository.findRolesByIds).mockResolvedValue([standardRole])
    vi.mocked(repository.findUserRoles)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([standardRole])
    vi.mocked(repository.replaceUserRoles).mockResolvedValue(true)

    await expect(service.replaceUserRoles('target-id', [3, 3], administrator)).resolves.toEqual([standardRole])
    expect(repository.findRolesByIds).toHaveBeenCalledWith([3])
    expect(repository.replaceUserRoles).toHaveBeenCalledWith(
      'target-id',
      [3],
      'caller-id',
      false,
      expect.any(Function)
    )
  })
})
