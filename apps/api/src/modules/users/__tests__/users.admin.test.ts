import type { FastifyInstance } from 'fastify'

import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '#api/app.js'
import { db } from '#api/db/index.js'
import { roles } from '#api/modules/roles'
import { profiles, users } from '#api/modules/users'

describe('admin user routes', () => {
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
    const systemRoles = await db.select().from(roles)
    roleIds = Object.fromEntries(systemRoles.map(role => [role.name, role.id])) as typeof roleIds
  })

  afterAll(async () => app.close())

  it('rejects unauthenticated requests on all admin endpoints', async () => {
    const id = '00000000-0000-0000-0000-000000000000'
    const list = await app.inject({ method: 'GET', url: '/api/v1/admin/users' })
    const patch = await app.inject({ method: 'PATCH', url: `/api/v1/admin/users/${id}/role`, payload: { roleId: id } })
    const remove = await app.inject({ method: 'DELETE', url: `/api/v1/admin/users/${id}` })
    expect([list.statusCode, patch.statusCode, remove.statusCode]).toEqual([401, 401, 401])
  })

  it('rejects a valid session whose user no longer exists', async () => {
    const ghost = await createUser('ghost@example.com', 'admin')
    await db.delete(users).where(eq(users.id, ghost.id))

    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: session(ghost.token) })
    expect(response.statusCode).toBe(401)
  })

  it('forbids users without users:read and lists users with role objects for admins', async () => {
    const standard = await createUser('standard@example.com')
    const admin = await createUser('admin@example.com', 'admin')
    const superAdmin = await createUser('super@example.com', 'super_admin')

    const forbidden = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: session(standard.token) })
    expect(forbidden.statusCode).toBe(403)

    for (const actor of [admin, superAdmin]) {
      const response = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: session(actor.token) })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.pagination).toMatchObject({ page: 1, limit: 20 })
      expect(body.data.length).toBeGreaterThanOrEqual(3)
      expect(body.data[0].role).toMatchObject({ name: expect.any(String), isSystem: expect.any(Boolean) })
      expect(response.body).not.toContain('passwordHash')
    }
  })

  it('enforces the role-assignment rules', async () => {
    const admin = await createUser('matrix-admin@example.com', 'admin')
    const superAdmin = await createUser('matrix-super@example.com', 'super_admin')
    const standard = await createUser('matrix-user@example.com')

    // users:manage allows assigning non-super_admin roles
    const grantAdmin = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${standard.id}/role`,
      headers: session(admin.token),
      payload: { roleId: roleIds.admin }
    })
    expect(grantAdmin.statusCode).toBe(200)
    expect(grantAdmin.json()).toMatchObject({ id: standard.id, role: { name: 'admin', isSystem: true } })

    // only super admins may hand out the super_admin role
    const grantSuper = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${standard.id}/role`,
      headers: session(admin.token),
      payload: { roleId: roleIds.super_admin }
    })
    expect(grantSuper.statusCode).toBe(403)

    // only super admins may change a super admin's role
    const demoteSuper = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${superAdmin.id}/role`,
      headers: session(admin.token),
      payload: { roleId: roleIds.user }
    })
    expect(demoteSuper.statusCode).toBe(403)

    const superGrantsSuper = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${standard.id}/role`,
      headers: session(superAdmin.token),
      payload: { roleId: roleIds.super_admin }
    })
    expect(superGrantsSuper.statusCode).toBe(200)

    const superDemotes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${standard.id}/role`,
      headers: session(superAdmin.token),
      payload: { roleId: roleIds.user }
    })
    expect(superDemotes.statusCode).toBe(200)
    expect(superDemotes.json()).toMatchObject({ role: { name: 'user' } })

    // nobody changes their own role
    const selfChange = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${superAdmin.id}/role`,
      headers: session(superAdmin.token),
      payload: { roleId: roleIds.user }
    })
    expect(selfChange.statusCode).toBe(403)

    const missingUser = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/users/00000000-0000-0000-0000-000000000000/role',
      headers: session(superAdmin.token),
      payload: { roleId: roleIds.user }
    })
    expect(missingUser.statusCode).toBe(404)

    const missingRole = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${standard.id}/role`,
      headers: session(superAdmin.token),
      payload: { roleId: '00000000-0000-0000-0000-000000000000' }
    })
    expect(missingRole.statusCode).toBe(404)

    const invalidRole = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${standard.id}/role`,
      headers: session(superAdmin.token),
      payload: { roleId: 'not-a-uuid' }
    })
    expect(invalidRole.statusCode).toBe(422)
  })

  it('enforces the deletion rules', async () => {
    const admin = await createUser('delete-admin@example.com', 'admin')
    const otherAdmin = await createUser('delete-admin-2@example.com', 'admin')
    const superAdmin = await createUser('delete-super@example.com', 'super_admin')
    const otherSuper = await createUser('delete-super-2@example.com', 'super_admin')
    const standard = await createUser('delete-user@example.com')

    // users:manage cannot touch super admin holders
    const adminDeletesSuper = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${otherSuper.id}`,
      headers: session(admin.token)
    })
    expect(adminDeletesSuper.statusCode).toBe(403)

    const selfDelete = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${superAdmin.id}`,
      headers: session(superAdmin.token)
    })
    expect(selfDelete.statusCode).toBe(403)

    const adminDeletesAdmin = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${otherAdmin.id}`,
      headers: session(admin.token)
    })
    expect(adminDeletesAdmin.statusCode).toBe(204)

    const adminDeletesUser = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${standard.id}`,
      headers: session(admin.token)
    })
    expect(adminDeletesUser.statusCode).toBe(204)
    expect(await db.select().from(users).where(eq(users.id, standard.id))).toEqual([])

    const superDeletesSuper = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${otherSuper.id}`,
      headers: session(superAdmin.token)
    })
    expect(superDeletesSuper.statusCode).toBe(204)

    const missing = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${standard.id}`,
      headers: session(superAdmin.token)
    })
    expect(missing.statusCode).toBe(404)
  })

  it('reads permissions fresh from the database on every request', async () => {
    const admin = await createUser('fresh-admin@example.com', 'admin')

    const before = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: session(admin.token) })
    expect(before.statusCode).toBe(200)

    await db.update(users).set({ roleId: roleIds.user }).where(eq(users.id, admin.id))

    const after = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: session(admin.token) })
    expect(after.statusCode).toBe(403)
  })

  it('rejects cross-site mutations on admin endpoints', async () => {
    const superAdmin = await createUser('csrf-super@example.com', 'super_admin')
    const standard = await createUser('csrf-user@example.com')

    const crossSite = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${standard.id}`,
      headers: { ...session(superAdmin.token), 'origin': 'https://evil.example', 'sec-fetch-site': 'cross-site' }
    })
    expect(crossSite.statusCode).toBe(403)
  })
})
