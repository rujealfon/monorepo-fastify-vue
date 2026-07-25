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

    const [standardRole] = await db.select().from(roles).where(eq(roles.slug, 'standard-user'))
    standardRoleId = standardRole.id

    userId = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ email: 'roles-repo@example.com', passwordHash: 'hash' }).returning()
      await tx.insert(userRoles).values({ userId: user.id, roleId: standardRoleId })
      return user.id
    })

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

  it('counts assigned users per role', async () => {
    const roleList = await rolesRepository.findRoles()
    const standard = roleList.find(role => role.id === standardRoleId)
    expect(standard?.userCount).toBe(1)

    const [emptyRole] = await db.insert(roles).values({ name: 'Empty', slug: 'empty' }).returning()
    const refreshed = await rolesRepository.findRoles()
    expect(refreshed.find(role => role.id === emptyRole.id)?.userCount).toBe(0)

    await db.delete(roles).where(eq(roles.id, emptyRole.id))
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

  it('does not delete a role that is a user\'s only role', async () => {
    const [onlyRole] = await db.insert(roles).values({ name: 'Only Role', slug: 'only-role' }).returning()
    const onlyRoleUser = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ email: 'only-role@example.com', passwordHash: 'hash' }).returning()
      await tx.insert(userRoles).values({ userId: user.id, roleId: onlyRole.id })
      return user
    })

    expect(await rolesRepository.deleteRoleById(onlyRole.id)).toBe(false)
    expect(await rolesRepository.findRoleById(onlyRole.id)).toBeDefined()

    await db.insert(userRoles).values({ userId: onlyRoleUser.id, roleId: standardRoleId })
    expect(await rolesRepository.deleteRoleById(onlyRole.id)).toMatchObject({ id: onlyRole.id })
    expect((await rolesRepository.findUserRoles(onlyRoleUser.id)).map(role => role.id)).toEqual([standardRoleId])

    await db.delete(users).where(eq(users.id, onlyRoleUser.id))
  })

  it('uses a consistent lock order when deleting and deactivating a role', async () => {
    const [concurrentRole] = await db.insert(roles).values({ name: 'Concurrent Role', slug: 'concurrent-role' }).returning()
    await db.insert(userRoles).values({ userId, roleId: concurrentRole.id })

    const results = await Promise.allSettled([
      rolesRepository.deleteRoleById(concurrentRole.id),
      rolesRepository.updateRoleById(concurrentRole.id, { isActive: false })
    ])

    expect(results.map(result => result.status)).toEqual(['fulfilled', 'fulfilled'])
    expect(await rolesRepository.findRoleById(concurrentRole.id)).toBeUndefined()
  })

  it('does not deadlock when deletion races permission replacement', async () => {
    const [permissionRole] = await db.insert(roles).values({ name: 'Permission Role', slug: 'permission-role' }).returning()
    await db.insert(userRoles).values({ userId, roleId: permissionRole.id })
    await rolesRepository.replaceRolePermissions(permissionRole.id, [profileReadId], userId)

    const results = await Promise.allSettled([
      rolesRepository.replaceRolePermissions(permissionRole.id, [profileReadId], userId),
      rolesRepository.deleteRoleById(permissionRole.id)
    ])

    const rejected = results.filter(result => result.status === 'rejected')
    expect(rejected).not.toContainEqual(
      expect.objectContaining({ reason: expect.objectContaining({ cause: expect.objectContaining({ code: '40P01' }) }) })
    )
  })

  it('does not deadlock when deletion races a retained role assignment', async () => {
    const [retainedRole] = await db.insert(roles).values({ name: 'Retained Role', slug: 'retained-role' }).returning()
    await db.insert(userRoles).values({ userId, roleId: retainedRole.id })

    const results = await Promise.allSettled([
      rolesRepository.replaceUserRoles(userId, [standardRoleId, retainedRole.id], userId),
      rolesRepository.deleteRoleById(retainedRole.id)
    ])

    const rejected = results.filter(result => result.status === 'rejected')
    expect(rejected).not.toContainEqual(
      expect.objectContaining({ reason: expect.objectContaining({ cause: expect.objectContaining({ code: '40P01' }) }) })
    )
  })

  it('locks the wildcard permission before users during concurrent revocation and permission replacement', async () => {
    const [superAdminRole] = await db.select().from(roles).where(eq(roles.slug, 'super-admin'))
    const [wildcardPermission] = await db.select().from(permissions).where(eq(permissions.key, '*'))
    await db.insert(userRoles).values({ userId, roleId: superAdminRole.id })
    const otherUserId = await db.transaction(async (tx) => {
      const [otherUser] = await tx.insert(users).values({ email: 'wildcard-lock@example.com', passwordHash: 'hash' }).returning()
      await tx.insert(userRoles).values({ userId: otherUser.id, roleId: superAdminRole.id })
      return otherUser.id
    })

    const results = await Promise.allSettled([
      rolesRepository.replaceUserRoles(userId, [standardRoleId], userId, true),
      rolesRepository.replaceRolePermissions(superAdminRole.id, [wildcardPermission.id], userId)
    ])

    expect(results.map(result => result.status)).toEqual(['fulfilled', 'fulfilled'])
    await db.delete(users).where(eq(users.id, otherUserId))
  })

  it('replaces user roles and bumps the version', async () => {
    const before = await db.select({ version: users.authorizationVersion }).from(users).where(eq(users.id, userId))

    await rolesRepository.replaceUserRoles(userId, [standardRoleId], userId)

    const after = await db.select({ version: users.authorizationVersion }).from(users).where(eq(users.id, userId))
    expect(after[0].version).toBe(before[0].version + 1)

    const assigned = await rolesRepository.findUserRoles(userId)
    expect(assigned.map(role => role.id)).toEqual([standardRoleId])

    const roleList = await rolesRepository.findRoles()
    expect(roleList.find(role => role.id === standardRoleId)?.userCount).toBe(1)
  })

  it('serializes concurrent super-admin revocations', async () => {
    const [secondUser] = await db.insert(users).values({ email: 'roles-repo-2@example.com', passwordHash: 'hash' }).returning()
    const [superAdminRole] = await db.select().from(roles).where(eq(roles.slug, 'super-admin'))
    await db.insert(userRoles).values([
      { userId, roleId: superAdminRole.id },
      { userId: secondUser.id, roleId: superAdminRole.id }
    ])

    const results = await Promise.all([
      rolesRepository.replaceUserRoles(userId, [standardRoleId], userId, true),
      rolesRepository.replaceUserRoles(secondUser.id, [standardRoleId], secondUser.id, true)
    ])

    expect(results.filter(Boolean)).toHaveLength(1)

    const roleList = await rolesRepository.findRoles()
    expect(roleList.find(role => role.id === superAdminRole.id)?.userCount).toBe(1)
  })
})
