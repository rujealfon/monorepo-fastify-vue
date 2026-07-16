import type { AuthorizationContext } from '#api/modules/roles/roles.service.js'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as permissionsRepository from '#api/modules/permissions/permissions.repository.js'
import {
  LastSuperAdminError,
  PermissionEscalationError,
  RoleNotFoundError,
  RoleSlugTakenError,
  SuperAdminAssignmentError,
  SystemRoleProtectedError,
  UnknownPermissionIdsError,
  UnknownRoleIdsError
} from '#api/modules/roles/roles.errors.js'
import * as rolesRepository from '#api/modules/roles/roles.repository.js'
import * as rolesService from '#api/modules/roles/roles.service.js'

vi.mock('#api/modules/roles/roles.repository.js')
vi.mock('#api/modules/permissions/permissions.repository.js')
vi.mock('#api/modules/audit-logs')

const now = new Date()

const superAdminRole = {
  id: 1,
  name: 'Super Admin',
  slug: 'super-admin',
  description: null,
  isSystem: true,
  isActive: true,
  createdAt: now,
  updatedAt: now
}

const customRole = {
  id: 10,
  name: 'Support',
  slug: 'support',
  description: null,
  isSystem: false,
  isActive: true,
  createdAt: now,
  updatedAt: now
}

const standardRole = { ...customRole, id: 11, name: 'Viewer', slug: 'viewer' }

const wildcardPermission = { id: 1, key: '*', resource: 'system', action: 'all', description: null, isSystem: true, createdAt: now }
const usersReadPermission = { id: 2, key: 'users.read', resource: 'users', action: 'read', description: null, isSystem: true, createdAt: now }
const usersDeletePermission = { id: 3, key: 'users.delete', resource: 'users', action: 'delete', description: null, isSystem: true, createdAt: now }

function caller(permissions: string[]): AuthorizationContext {
  return {
    user: { id: 'caller-id', email: 'caller@example.com' },
    roles: [],
    permissions: new Set(permissions),
    authorizationVersion: 1
  }
}

describe('roles.service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(rolesRepository.findPermissionKeysByRoleIds).mockResolvedValue([])
  })

  describe('getAuthorization', () => {
    it('collapses join rows into roles and a permission set', async () => {
      vi.mocked(rolesRepository.findAuthorizationRows).mockResolvedValue([
        { userId: 'u1', email: 'a@example.com', authorizationVersion: 3, roleId: 1, roleName: 'Admin', roleSlug: 'admin', permissionKey: 'users.read' },
        { userId: 'u1', email: 'a@example.com', authorizationVersion: 3, roleId: 1, roleName: 'Admin', roleSlug: 'admin', permissionKey: 'roles.read' },
        { userId: 'u1', email: 'a@example.com', authorizationVersion: 3, roleId: 2, roleName: 'Viewer', roleSlug: 'viewer', permissionKey: 'users.read' }
      ])

      const context = await rolesService.getAuthorization('u1')
      expect(context?.roles).toEqual([
        { id: 1, name: 'Admin', slug: 'admin' },
        { id: 2, name: 'Viewer', slug: 'viewer' }
      ])
      expect([...context!.permissions].sort()).toEqual(['roles.read', 'users.read'])
      expect(context?.authorizationVersion).toBe(3)
    })

    it('returns a context with no permissions for a user without roles', async () => {
      vi.mocked(rolesRepository.findAuthorizationRows).mockResolvedValue([
        { userId: 'u1', email: 'a@example.com', authorizationVersion: 1, roleId: null, roleName: null, roleSlug: null, permissionKey: null }
      ])

      const context = await rolesService.getAuthorization('u1')
      expect(context?.roles).toEqual([])
      expect(context?.permissions.size).toBe(0)
    })

    it('returns null for an unknown user', async () => {
      vi.mocked(rolesRepository.findAuthorizationRows).mockResolvedValue([])
      expect(await rolesService.getAuthorization('missing')).toBeNull()
    })
  })

  describe('createRole', () => {
    it('maps unique violations to RoleSlugTakenError', async () => {
      vi.mocked(rolesRepository.insertRole).mockRejectedValue(new Error('insert failed', { cause: { code: '23505' } }))
      await expect(rolesService.createRole({ name: 'Support', slug: 'support' }, 'caller-id')).rejects.toBeInstanceOf(RoleSlugTakenError)
    })
  })

  describe('updateRole', () => {
    it('rejects deactivating the super admin role', async () => {
      vi.mocked(rolesRepository.findRoleById).mockResolvedValue(superAdminRole)
      await expect(rolesService.updateRole(1, { isActive: false }, 'caller-id')).rejects.toBeInstanceOf(SystemRoleProtectedError)
    })

    it('throws for an unknown role', async () => {
      vi.mocked(rolesRepository.findRoleById).mockResolvedValue(undefined)
      await expect(rolesService.updateRole(99, { name: 'X' }, 'caller-id')).rejects.toBeInstanceOf(RoleNotFoundError)
    })
  })

  describe('deleteRole', () => {
    it('rejects deleting system roles', async () => {
      vi.mocked(rolesRepository.findRoleById).mockResolvedValue(superAdminRole)
      await expect(rolesService.deleteRole(1, 'caller-id')).rejects.toBeInstanceOf(SystemRoleProtectedError)
    })

    it('deletes non-system roles', async () => {
      vi.mocked(rolesRepository.findRoleById).mockResolvedValue(customRole)
      vi.mocked(rolesRepository.deleteRoleById).mockResolvedValue(customRole)
      await rolesService.deleteRole(10, 'caller-id')
      expect(rolesRepository.deleteRoleById).toHaveBeenCalledWith(10, expect.any(Function))
    })

    it('rejects deleting a role with the wildcard permission', async () => {
      vi.mocked(rolesRepository.findRoleById).mockResolvedValue(customRole)
      vi.mocked(rolesRepository.findPermissionKeysByRoleIds).mockResolvedValue(['*'])
      await expect(rolesService.deleteRole(10, 'caller-id')).rejects.toBeInstanceOf(SystemRoleProtectedError)
    })
  })

  describe('replaceRolePermissions', () => {
    it('rejects unknown permission ids', async () => {
      vi.mocked(rolesRepository.findRoleById).mockResolvedValue(customRole)
      vi.mocked(permissionsRepository.findPermissionsByIds).mockResolvedValue([usersReadPermission])
      await expect(rolesService.replaceRolePermissions(10, [2, 999], caller(['*'])))
        .rejects
        .toBeInstanceOf(UnknownPermissionIdsError)
    })

    it('rejects assigning permissions the caller does not possess', async () => {
      vi.mocked(rolesRepository.findRoleById).mockResolvedValue(customRole)
      vi.mocked(permissionsRepository.findPermissionsByIds).mockResolvedValue([usersReadPermission, usersDeletePermission])
      await expect(rolesService.replaceRolePermissions(10, [2, 3], caller(['users.read', 'roles.assign_permissions'])))
        .rejects
        .toBeInstanceOf(PermissionEscalationError)
    })

    it('rejects assigning the wildcard without holding it', async () => {
      vi.mocked(rolesRepository.findRoleById).mockResolvedValue(customRole)
      vi.mocked(permissionsRepository.findPermissionsByIds).mockResolvedValue([wildcardPermission])
      await expect(rolesService.replaceRolePermissions(10, [1], caller(['users.read'])))
        .rejects
        .toBeInstanceOf(PermissionEscalationError)
    })

    it('keeps the wildcard on the super admin role', async () => {
      vi.mocked(rolesRepository.findRoleById).mockResolvedValue(superAdminRole)
      vi.mocked(permissionsRepository.findPermissionsByIds).mockResolvedValue([usersReadPermission])
      await expect(rolesService.replaceRolePermissions(1, [2], caller(['*'])))
        .rejects
        .toBeInstanceOf(SystemRoleProtectedError)
    })

    it('replaces permissions for a wildcard caller', async () => {
      vi.mocked(rolesRepository.findRoleById).mockResolvedValue(customRole)
      vi.mocked(permissionsRepository.findPermissionsByIds).mockResolvedValue([usersReadPermission])
      vi.mocked(rolesRepository.replaceRolePermissions).mockResolvedValue()
      vi.mocked(rolesRepository.findRolePermissions).mockResolvedValue([usersReadPermission])

      const result = await rolesService.replaceRolePermissions(10, [2, 2], caller(['*']))
      expect(rolesRepository.replaceRolePermissions).toHaveBeenCalledWith(10, [2], 'caller-id', expect.any(Function))
      expect(result.permissions).toEqual([usersReadPermission])
    })
  })

  describe('replaceUserRoles', () => {
    beforeEach(() => {
      vi.mocked(rolesRepository.findUserById).mockResolvedValue({ id: 'target-id' })
    })

    it('rejects unknown role ids', async () => {
      vi.mocked(rolesRepository.findRolesByIds).mockResolvedValue([])
      await expect(rolesService.replaceUserRoles('target-id', [999], caller(['users.assign_roles'])))
        .rejects
        .toBeInstanceOf(UnknownRoleIdsError)
    })

    it('rejects granting a custom wildcard role without the wildcard', async () => {
      vi.mocked(rolesRepository.findRolesByIds).mockResolvedValue([customRole])
      vi.mocked(rolesRepository.findUserRoles).mockResolvedValue([])
      vi.mocked(rolesRepository.findPermissionKeysByRoleIds)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['*'])
      await expect(rolesService.replaceUserRoles('target-id', [10], caller(['users.assign_roles'])))
        .rejects
        .toBeInstanceOf(SuperAdminAssignmentError)
    })

    it('rejects revoking a custom wildcard role without the wildcard', async () => {
      vi.mocked(rolesRepository.findRolesByIds).mockResolvedValue([standardRole])
      vi.mocked(rolesRepository.findUserRoles).mockResolvedValue([customRole])
      vi.mocked(rolesRepository.findPermissionKeysByRoleIds)
        .mockResolvedValueOnce(['*'])
        .mockResolvedValueOnce([])
      await expect(rolesService.replaceUserRoles('target-id', [11], caller(['users.assign_roles'])))
        .rejects
        .toBeInstanceOf(SuperAdminAssignmentError)
    })

    it('rejects removing the last super admin', async () => {
      vi.mocked(rolesRepository.findRolesByIds).mockResolvedValue([customRole])
      vi.mocked(rolesRepository.findUserRoles).mockResolvedValue([superAdminRole])
      vi.mocked(rolesRepository.findPermissionKeysByRoleIds)
        .mockResolvedValueOnce(['*'])
        .mockResolvedValueOnce([])
      vi.mocked(rolesRepository.replaceUserRoles).mockResolvedValue(false)
      await expect(rolesService.replaceUserRoles('target-id', [10], caller(['*'])))
        .rejects
        .toBeInstanceOf(LastSuperAdminError)
      expect(rolesRepository.replaceUserRoles).toHaveBeenCalledWith('target-id', [10], 'caller-id', true, expect.any(Function))
    })

    it('replaces roles when another super admin remains', async () => {
      vi.mocked(rolesRepository.findRolesByIds).mockResolvedValue([customRole])
      vi.mocked(rolesRepository.findUserRoles)
        .mockResolvedValueOnce([superAdminRole])
        .mockResolvedValueOnce([customRole])
      vi.mocked(rolesRepository.findPermissionKeysByRoleIds)
        .mockResolvedValueOnce(['*'])
        .mockResolvedValueOnce([])
      vi.mocked(rolesRepository.replaceUserRoles).mockResolvedValue(true)

      const result = await rolesService.replaceUserRoles('target-id', [10], caller(['*']))
      expect(rolesRepository.replaceUserRoles).toHaveBeenCalledWith('target-id', [10], 'caller-id', true, expect.any(Function))
      expect(result).toEqual([customRole])
    })

    it('rejects assigning a role whose permissions the caller does not possess', async () => {
      vi.mocked(rolesRepository.findRolesByIds).mockResolvedValue([customRole])
      vi.mocked(rolesRepository.findUserRoles).mockResolvedValue([])
      vi.mocked(rolesRepository.findPermissionKeysByRoleIds).mockResolvedValue(['users.delete'])
      await expect(rolesService.replaceUserRoles('target-id', [10], caller(['users.assign_roles'])))
        .rejects
        .toBeInstanceOf(PermissionEscalationError)
      expect(rolesRepository.replaceUserRoles).not.toHaveBeenCalled()
    })

    it('allows assigning a role whose permissions the caller already holds', async () => {
      vi.mocked(rolesRepository.findRolesByIds).mockResolvedValue([customRole])
      vi.mocked(rolesRepository.findUserRoles)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([customRole])
      vi.mocked(rolesRepository.findPermissionKeysByRoleIds).mockResolvedValue(['users.assign_roles'])
      vi.mocked(rolesRepository.replaceUserRoles).mockResolvedValue(true)

      const result = await rolesService.replaceUserRoles('target-id', [10], caller(['users.assign_roles']))
      expect(result).toEqual([customRole])
    })
  })
})
