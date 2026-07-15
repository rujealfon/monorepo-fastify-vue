import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db } from '#api/db/index.js'
import { permissions } from '#api/modules/permissions/permissions.schema.js'
import * as rolesRepository from '#api/modules/roles/roles.repository.js'
import { roles, userRoles } from '#api/modules/roles/roles.schema.js'
import { users } from '#api/modules/users/users.schema.js'

describe('roles.repository', () => {
  let userId: string
  let standardRoleId: number
  let profileReadId: number

  beforeAll(async () => {
    await db.execute(sql`delete from users`)

    const [user] = await db.insert(users).values({ email: 'roles-repo@example.com', passwordHash: 'hash' }).returning()
    userId = user.id

    const [standardRole] = await db.select().from(roles).where(eq(roles.slug, 'standard-user'))
    standardRoleId = standardRole.id

    const [profileRead] = await db.select().from(permissions).where(eq(permissions.key, 'profile.read_own'))
    profileReadId = profileRead.id
  })

  afterAll(async () => {
    await db.execute(sql`delete from users`)
    await db.$client.end()
  })

  it('assigns a seeded role by slug idempotently', async () => {
    await rolesRepository.assignRoleBySlug(db, userId, 'standard-user')
    await rolesRepository.assignRoleBySlug(db, userId, 'standard-user')

    const assigned = await rolesRepository.findUserRoles(userId)
    expect(assigned.map(role => role.slug)).toEqual(['standard-user'])
  })

  it('resolves the authorization rows with role permissions', async () => {
    const rows = await rolesRepository.findAuthorizationRows(userId)
    const keys = rows.map(row => row.permissionKey)
    expect(keys).toContain('profile.read_own')
    expect(keys).toContain('tasks.read')
    expect(rows[0].email).toBe('roles-repo@example.com')
  })

  it('excludes permissions from inactive roles', async () => {
    const [inactiveRole] = await db.insert(roles).values({ name: 'Dormant', slug: 'dormant', isActive: false }).returning()
    await rolesRepository.replaceRolePermissions(inactiveRole.id, [profileReadId], userId)
    await db.insert(userRoles).values({ userId, roleId: inactiveRole.id })

    const rows = await rolesRepository.findAuthorizationRows(userId)
    expect(rows.some(row => row.roleSlug === 'dormant')).toBe(false)

    await db.delete(roles).where(eq(roles.id, inactiveRole.id))
  })

  it('resolves the distinct union of permission keys across roles', async () => {
    const [extraRole] = await db.insert(roles).values({ name: 'Extra', slug: 'extra' }).returning()
    await rolesRepository.replaceRolePermissions(extraRole.id, [profileReadId], userId)

    const keys = await rolesRepository.findPermissionKeysByRoleIds([standardRoleId, extraRole.id])
    expect(keys).toContain('profile.read_own')
    expect(new Set(keys).size).toBe(keys.length)

    await db.delete(roles).where(eq(roles.id, extraRole.id))
  })

  it('returns an empty array for no role ids', async () => {
    expect(await rolesRepository.findPermissionKeysByRoleIds([])).toEqual([])
  })

  it('bumps the authorization version of affected users when replacing role permissions', async () => {
    const before = await db.select({ version: users.authorizationVersion }).from(users).where(eq(users.id, userId))
    const rolePermissions = await rolesRepository.findRolePermissions(standardRoleId)

    await rolesRepository.replaceRolePermissions(standardRoleId, rolePermissions.map(permission => permission.id), userId)

    const after = await db.select({ version: users.authorizationVersion }).from(users).where(eq(users.id, userId))
    expect(after[0].version).toBe(before[0].version + 1)
  })

  it('replaces user roles and bumps the version', async () => {
    const before = await db.select({ version: users.authorizationVersion }).from(users).where(eq(users.id, userId))

    await rolesRepository.replaceUserRoles(userId, [standardRoleId], userId)

    const after = await db.select({ version: users.authorizationVersion }).from(users).where(eq(users.id, userId))
    expect(after[0].version).toBe(before[0].version + 1)

    const assigned = await rolesRepository.findUserRoles(userId)
    expect(assigned.map(role => role.id)).toEqual([standardRoleId])
    expect(await rolesRepository.countUsersWithRole(standardRoleId)).toBe(1)
  })

  it('serializes concurrent super-admin revocations', async () => {
    const [secondUser] = await db.insert(users).values({ email: 'roles-repo-2@example.com', passwordHash: 'hash' }).returning()
    const [superAdminRole] = await db.select().from(roles).where(eq(roles.slug, 'super-admin'))
    await db.insert(userRoles).values([
      { userId, roleId: superAdminRole.id },
      { userId: secondUser.id, roleId: superAdminRole.id }
    ])

    const results = await Promise.all([
      rolesRepository.replaceUserRoles(userId, [standardRoleId], userId, superAdminRole.id),
      rolesRepository.replaceUserRoles(secondUser.id, [standardRoleId], secondUser.id, superAdminRole.id)
    ])

    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await rolesRepository.countUsersWithRole(superAdminRole.id)).toBe(1)
  })
})
