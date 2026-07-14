import type { FastifyInstance } from 'fastify'

import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '#api/app.js'
import { db } from '#api/db/index.js'
import { PERMISSIONS, roles } from '#api/modules/roles'
import { profiles, users } from '#api/modules/users'

describe('admin role routes', () => {
  let app: FastifyInstance
  let roleIds: Record<'user' | 'admin' | 'super_admin', string>

  async function createUser(email: string, roleName: keyof typeof roleIds = 'user') {
    const [user] = await db.insert(users).values({ email, passwordHash: 'x', roleId: roleIds[roleName] }).returning()
    await db.insert(profiles).values({ userId: user.id })
    return { ...user, token: app.jwt.sign({ sub: user.id }) }
  }

  function session(token: string) {
    return { cookie: `session=${token}` }
  }

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
    await db.execute(sql`truncate table users cascade`)
    await db.delete(roles).where(eq(roles.isSystem, false))
    const systemRoles = await db.select().from(roles)
    roleIds = Object.fromEntries(systemRoles.map(role => [role.name, role.id])) as typeof roleIds
  })

  afterAll(async () => {
    await db.delete(roles).where(eq(roles.isSystem, false))
    await app.close()
  })

  it('gates role endpoints by permission', async () => {
    const standard = await createUser('roles-user@example.com')
    const admin = await createUser('roles-admin@example.com', 'admin')

    const unauthenticated = await app.inject({ method: 'GET', url: '/api/v1/admin/roles' })
    expect(unauthenticated.statusCode).toBe(401)

    const noRead = await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: session(standard.token) })
    expect(noRead.statusCode).toBe(403)

    // admin has roles:read but not roles:manage
    const read = await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: session(admin.token) })
    expect(read.statusCode).toBe(200)

    const noManage = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(admin.token),
      payload: { name: 'blocked', permissions: [] }
    })
    expect(noManage.statusCode).toBe(403)

    const catalog = await app.inject({ method: 'GET', url: '/api/v1/admin/permissions', headers: session(admin.token) })
    expect(catalog.statusCode).toBe(200)
    const values = catalog.json().data.flatMap((group: { permissions: { value: string }[] }) =>
      group.permissions.map(permission => permission.value))
    expect(values.sort()).toEqual([...PERMISSIONS].sort())
  })

  it('lists system roles with computed super admin permissions and user counts', async () => {
    const superAdmin = await createUser('roles-super@example.com', 'super_admin')

    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: session(superAdmin.token) })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    const byName = Object.fromEntries(body.data.map((role: { name: string }) => [role.name, role]))

    expect(byName.super_admin).toMatchObject({ isSystem: true, permissions: expect.arrayContaining([...PERMISSIONS]) })
    expect(byName.admin.permissions.sort()).toEqual(['roles:read', 'users:manage', 'users:read'])
    expect(byName.user.permissions).toEqual([])
    expect(byName.super_admin.userCount).toBeGreaterThanOrEqual(1)
  })

  it('creates, updates and deletes custom roles', async () => {
    const superAdmin = await createUser('roles-crud-super@example.com', 'super_admin')

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(superAdmin.token),
      payload: { name: 'support', description: 'Read-only user access', permissions: ['users:read'] }
    })
    expect(created.statusCode).toBe(201)
    const role = created.json()
    expect(role).toMatchObject({ name: 'support', isSystem: false, permissions: ['users:read'], userCount: 0 })

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(superAdmin.token),
      payload: { name: 'support', permissions: [] }
    })
    expect(duplicate.statusCode).toBe(409)

    const invalidPermission = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(superAdmin.token),
      payload: { name: 'invalid', permissions: ['not:a:permission'] }
    })
    expect(invalidPermission.statusCode).toBe(422)

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${role.id}`,
      headers: session(superAdmin.token),
      payload: { name: 'support-team', permissions: ['users:read', 'roles:read'] }
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json()).toMatchObject({ name: 'support-team', permissions: ['users:read', 'roles:read'] })

    const missing = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/roles/00000000-0000-0000-0000-000000000000',
      headers: session(superAdmin.token),
      payload: { name: 'ghost' }
    })
    expect(missing.statusCode).toBe(404)

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/roles/${role.id}`,
      headers: session(superAdmin.token)
    })
    expect(removed.statusCode).toBe(204)
  })

  it('protects system roles and roles in use', async () => {
    const superAdmin = await createUser('roles-guard-super@example.com', 'super_admin')

    const renameSystem = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${roleIds.admin}`,
      headers: session(superAdmin.token),
      payload: { name: 'renamed-admin' }
    })
    expect(renameSystem.statusCode).toBe(403)

    // editing a non-super system role's permissions is allowed
    const grantRolesManage = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${roleIds.admin}`,
      headers: session(superAdmin.token),
      payload: { permissions: ['users:read', 'users:manage', 'roles:read'] }
    })
    expect(grantRolesManage.statusCode).toBe(200)

    const editSuperPermissions = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${roleIds.super_admin}`,
      headers: session(superAdmin.token),
      payload: { permissions: ['users:read'] }
    })
    expect(editSuperPermissions.statusCode).toBe(403)

    const describeSuper = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${roleIds.super_admin}`,
      headers: session(superAdmin.token),
      payload: { description: 'Full access, always' }
    })
    expect(describeSuper.statusCode).toBe(200)

    const deleteSystem = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/roles/${roleIds.user}`,
      headers: session(superAdmin.token)
    })
    expect(deleteSystem.statusCode).toBe(403)

    // a role with assigned users cannot be deleted
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(superAdmin.token),
      payload: { name: 'occupied', permissions: [] }
    })
    const occupied = created.json()
    const member = await createUser('roles-occupied-member@example.com')
    await db.update(users).set({ roleId: occupied.id }).where(eq(users.id, member.id))

    const deleteInUse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/roles/${occupied.id}`,
      headers: session(superAdmin.token)
    })
    expect(deleteInUse.statusCode).toBe(409)

    await db.update(users).set({ roleId: roleIds.user }).where(eq(users.id, member.id))
    const deleteFreed = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/roles/${occupied.id}`,
      headers: session(superAdmin.token)
    })
    expect(deleteFreed.statusCode).toBe(204)
  })

  it('applies permission changes to sessions immediately', async () => {
    const superAdmin = await createUser('roles-live-super@example.com', 'super_admin')
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(superAdmin.token),
      payload: { name: 'temp-viewers', permissions: ['users:read'] }
    })
    const role = created.json()
    const member = await createUser('roles-live-member@example.com')
    await db.update(users).set({ roleId: role.id }).where(eq(users.id, member.id))

    const allowed = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: session(member.token) })
    expect(allowed.statusCode).toBe(200)

    const strip = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${role.id}`,
      headers: session(superAdmin.token),
      payload: { permissions: [] }
    })
    expect(strip.statusCode).toBe(200)

    const denied = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: session(member.token) })
    expect(denied.statusCode).toBe(403)

    await db.update(users).set({ roleId: roleIds.user }).where(eq(users.id, member.id))
  })
})
