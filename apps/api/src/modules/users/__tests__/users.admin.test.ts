import type { FastifyInstance } from 'fastify'
import type { Role } from '#api/modules/users'

import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '#api/app.js'
import { db } from '#api/db/index.js'
import { profiles, users } from '#api/modules/users'

describe('admin user routes', () => {
  let app: FastifyInstance

  async function createUser(email: string, role: Role = 'user') {
    const [user] = await db.insert(users).values({ email, passwordHash: 'x', role }).returning()
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
  })

  afterAll(async () => app.close())

  it('rejects unauthenticated requests on all admin endpoints', async () => {
    const id = '00000000-0000-0000-0000-000000000000'
    const list = await app.inject({ method: 'GET', url: '/api/v1/admin/users' })
    const patch = await app.inject({ method: 'PATCH', url: `/api/v1/admin/users/${id}/role`, payload: { role: 'admin' } })
    const remove = await app.inject({ method: 'DELETE', url: `/api/v1/admin/users/${id}` })
    expect([list.statusCode, patch.statusCode, remove.statusCode]).toEqual([401, 401, 401])
  })

  it('rejects a valid session whose user no longer exists', async () => {
    const ghost = await createUser('ghost@example.com', 'admin')
    await db.delete(users).where(eq(users.id, ghost.id))

    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: session(ghost.token) })
    expect(response.statusCode).toBe(401)
  })

  it('forbids standard users and lists users for admin and super admin', async () => {
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
      expect(response.body).not.toContain('passwordHash')
    }
  })

  it('enforces the role-management matrix', async () => {
    const admin = await createUser('matrix-admin@example.com', 'admin')
    const otherAdmin = await createUser('matrix-admin-2@example.com', 'admin')
    const superAdmin = await createUser('matrix-super@example.com', 'super_admin')
    const standard = await createUser('matrix-user@example.com')

    // admin cannot grant a role at or above their own
    const grantAdmin = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${standard.id}/role`,
      headers: session(admin.token),
      payload: { role: 'admin' }
    })
    expect(grantAdmin.statusCode).toBe(403)

    // admin cannot manage another admin
    const demoteAdmin = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${otherAdmin.id}/role`,
      headers: session(admin.token),
      payload: { role: 'user' }
    })
    expect(demoteAdmin.statusCode).toBe(403)

    // admin may assign roles below their own to users they outrank
    const keepUser = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${standard.id}/role`,
      headers: session(admin.token),
      payload: { role: 'user' }
    })
    expect(keepUser.statusCode).toBe(200)

    // super admin can promote and demote anyone
    const promote = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${standard.id}/role`,
      headers: session(superAdmin.token),
      payload: { role: 'admin' }
    })
    expect(promote.statusCode).toBe(200)
    expect(promote.json()).toMatchObject({ id: standard.id, role: 'admin' })

    const demote = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${otherAdmin.id}/role`,
      headers: session(superAdmin.token),
      payload: { role: 'user' }
    })
    expect(demote.statusCode).toBe(200)
    expect(demote.json()).toMatchObject({ role: 'user' })

    // nobody can change their own role
    const selfChange = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${superAdmin.id}/role`,
      headers: session(superAdmin.token),
      payload: { role: 'user' }
    })
    expect(selfChange.statusCode).toBe(403)

    // unknown target and invalid role payloads
    const missing = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/users/00000000-0000-0000-0000-000000000000/role',
      headers: session(superAdmin.token),
      payload: { role: 'admin' }
    })
    expect(missing.statusCode).toBe(404)

    const invalidRole = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${standard.id}/role`,
      headers: session(superAdmin.token),
      payload: { role: 'owner' }
    })
    expect(invalidRole.statusCode).toBe(422)
  })

  it('enforces the deletion matrix', async () => {
    const admin = await createUser('delete-admin@example.com', 'admin')
    const otherAdmin = await createUser('delete-admin-2@example.com', 'admin')
    const superAdmin = await createUser('delete-super@example.com', 'super_admin')
    const standard = await createUser('delete-user@example.com')

    const adminDeletesAdmin = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${otherAdmin.id}`,
      headers: session(admin.token)
    })
    expect(adminDeletesAdmin.statusCode).toBe(403)

    const selfDelete = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${superAdmin.id}`,
      headers: session(superAdmin.token)
    })
    expect(selfDelete.statusCode).toBe(403)

    const adminDeletesUser = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${standard.id}`,
      headers: session(admin.token)
    })
    expect(adminDeletesUser.statusCode).toBe(204)
    expect(await db.select().from(users).where(eq(users.id, standard.id))).toEqual([])

    const superDeletesAdmin = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${otherAdmin.id}`,
      headers: session(superAdmin.token)
    })
    expect(superDeletesAdmin.statusCode).toBe(204)

    const missing = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${standard.id}`,
      headers: session(superAdmin.token)
    })
    expect(missing.statusCode).toBe(404)
  })

  it('reads the role fresh from the database on every request', async () => {
    const admin = await createUser('fresh-admin@example.com', 'admin')

    const before = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: session(admin.token) })
    expect(before.statusCode).toBe(200)

    await db.update(users).set({ role: 'user' }).where(eq(users.id, admin.id))

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
