import type { AppRawRule, AuthorizationContext } from '#api/modules/authorization'

import { createMongoAbility } from '@casl/ability'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  beforeEach(() => vi.resetAllMocks())

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
