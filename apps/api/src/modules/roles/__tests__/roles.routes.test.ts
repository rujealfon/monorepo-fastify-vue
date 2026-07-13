import type { FastifyInstance } from 'fastify'

import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '#api/app.js'
import { db } from '#api/db/index.js'
import { roles } from '#api/modules/roles'
import { profiles, users } from '#api/modules/users'

describe('admin role routes', () => {
  let app: FastifyInstance

  async function roleId(slug: string) {
    const [role] = await db.select().from(roles).where(eq(roles.slug, slug))
    return role.id
  }

  async function createUser(email: string, role = 'user') {
    const [user] = await db.insert(users).values({ email, passwordHash: 'x', roleId: await roleId(role) }).returning()
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
    await db.execute(sql`delete from roles where is_system = false`)
  })

  afterAll(async () => {
    await db.execute(sql`truncate table users cascade`)
    await db.execute(sql`delete from roles where is_system = false`)
    await app.close()
  })

  it('rejects unauthenticated requests on all role endpoints', async () => {
    const id = '00000000-0000-0000-0000-000000000000'
    const list = await app.inject({ method: 'GET', url: '/api/v1/admin/roles' })
    const create = await app.inject({ method: 'POST', url: '/api/v1/admin/roles', payload: { name: 'X', slug: 'x', rank: 1 } })
    const patch = await app.inject({ method: 'PATCH', url: `/api/v1/admin/roles/${id}`, payload: { name: 'X' } })
    const remove = await app.inject({ method: 'DELETE', url: `/api/v1/admin/roles/${id}` })
    expect([list.statusCode, create.statusCode, patch.statusCode, remove.statusCode]).toEqual([401, 401, 401, 401])
  })

  it('lists roles with their permissions for admins, forbids standard users', async () => {
    const standard = await createUser('roles-standard@example.com')
    const admin = await createUser('roles-admin@example.com', 'admin')

    const forbidden = await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: session(standard.token) })
    expect(forbidden.statusCode).toBe(403)

    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: session(admin.token) })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    const slugs = body.map((role: { slug: string }) => role.slug)
    expect(slugs).toEqual(expect.arrayContaining(['user', 'admin', 'super_admin']))
    const superAdminRole = body.find((role: { slug: string }) => role.slug === 'super_admin')
    expect(superAdminRole.permissions).toEqual([{ action: 'manage', subject: 'all', conditions: null }])
  })

  it('only allows role creation for holders of manage-all', async () => {
    const admin = await createUser('roles-create-admin@example.com', 'admin')
    const superAdmin = await createUser('roles-create-super@example.com', 'super_admin')

    const forbidden = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(admin.token),
      payload: { name: 'Moderator', slug: 'moderator', rank: 15 }
    })
    expect(forbidden.statusCode).toBe(403)

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(superAdmin.token),
      payload: { name: 'Moderator', slug: 'moderator', rank: 15, permissions: [{ action: 'read', subject: 'User' }] }
    })
    expect(created.statusCode).toBe(201)
    expect(created.json()).toMatchObject({
      slug: 'moderator',
      rank: 15,
      isSystem: false,
      permissions: [{ action: 'read', subject: 'User', conditions: null }]
    })

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(superAdmin.token),
      payload: { name: 'Moderator Again', slug: 'moderator', rank: 16 }
    })
    expect(duplicate.statusCode).toBe(409)
  })

  it('rejects permission rules carrying conditions until enforcement evaluates them', async () => {
    const superAdmin = await createUser('roles-conditions-super@example.com', 'super_admin')
    const conditionalPermissions = [{ action: 'read', subject: 'User', conditions: { ownerId: 'self' } }]

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(superAdmin.token),
      payload: { name: 'Scoped', slug: 'scoped', rank: 5, permissions: conditionalPermissions }
    })
    expect(created.statusCode).toBe(422)

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${await roleId('admin')}`,
      headers: session(superAdmin.token),
      payload: { permissions: conditionalPermissions }
    })
    expect(updated.statusCode).toBe(422)
  })

  it('updates custom roles but protects system roles', async () => {
    const superAdmin = await createUser('roles-update-super@example.com', 'super_admin')
    const [custom] = await db.insert(roles).values({ name: 'Support', slug: 'support', rank: 12 }).returning()

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${custom.id}`,
      headers: session(superAdmin.token),
      payload: { name: 'Support Team', permissions: [{ action: 'read', subject: 'User' }] }
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json()).toMatchObject({
      name: 'Support Team',
      permissions: [{ action: 'read', subject: 'User', conditions: null }]
    })

    const rankChange = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${await roleId('admin')}`,
      headers: session(superAdmin.token),
      payload: { rank: 99 }
    })
    expect(rankChange.statusCode).toBe(403)

    const superAdminEdit = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${await roleId('super_admin')}`,
      headers: session(superAdmin.token),
      payload: { name: 'Owner' }
    })
    expect(superAdminEdit.statusCode).toBe(403)

    const missing = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/roles/00000000-0000-0000-0000-000000000000',
      headers: session(superAdmin.token),
      payload: { name: 'Ghost' }
    })
    expect(missing.statusCode).toBe(404)
  })

  it('deletes custom roles but protects system and in-use roles', async () => {
    const superAdmin = await createUser('roles-delete-super@example.com', 'super_admin')
    const [unused] = await db.insert(roles).values({ name: 'Unused', slug: 'unused', rank: 11 }).returning()
    const [occupied] = await db.insert(roles).values({ name: 'Occupied', slug: 'occupied', rank: 13 }).returning()
    await db.insert(users).values({ email: 'roles-occupant@example.com', passwordHash: 'x', roleId: occupied.id })

    const removed = await app.inject({ method: 'DELETE', url: `/api/v1/admin/roles/${unused.id}`, headers: session(superAdmin.token) })
    expect(removed.statusCode).toBe(204)

    const system = await app.inject({ method: 'DELETE', url: `/api/v1/admin/roles/${await roleId('user')}`, headers: session(superAdmin.token) })
    expect(system.statusCode).toBe(403)

    const inUse = await app.inject({ method: 'DELETE', url: `/api/v1/admin/roles/${occupied.id}`, headers: session(superAdmin.token) })
    expect(inUse.statusCode).toBe(409)
  })

  it('blocks self-escalation for role managers without manage-all', async () => {
    const superAdmin = await createUser('roles-escalation-super@example.com', 'super_admin')
    const rolePermissions = [
      { action: 'create', subject: 'Role' },
      { action: 'read', subject: 'Role' },
      { action: 'update', subject: 'Role' },
      { action: 'delete', subject: 'Role' }
    ]

    const managerRole = (await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(superAdmin.token),
      payload: { name: 'Role Manager', slug: 'role_manager', rank: 18, permissions: rolePermissions }
    })).json()
    const juniorRole = (await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(superAdmin.token),
      payload: { name: 'Junior', slug: 'junior', rank: 5 }
    })).json()
    const seniorRole = (await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(superAdmin.token),
      payload: { name: 'Senior', slug: 'senior', rank: 25 }
    })).json()
    const manager = await createUser('roles-manager@example.com', 'role_manager')

    // cannot edit own role (rank not strictly dominated)
    const selfEscalation = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${managerRole.id}`,
      headers: session(manager.token),
      payload: { permissions: [...rolePermissions, { action: 'manage', subject: 'all' }] }
    })
    expect(selfEscalation.statusCode).toBe(403)

    // cannot grant permissions their own ability does not hold
    const grantEscalation = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${juniorRole.id}`,
      headers: session(manager.token),
      payload: { permissions: [{ action: 'manage', subject: 'all' }] }
    })
    expect(grantEscalation.statusCode).toBe(403)

    // cannot create or delete roles at or above their own rank
    const createAbove = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(manager.token),
      payload: { name: 'Shadow', slug: 'shadow', rank: 30 }
    })
    expect(createAbove.statusCode).toBe(403)

    const deleteAbove = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/roles/${seniorRole.id}`,
      headers: session(manager.token)
    })
    expect(deleteAbove.statusCode).toBe(403)

    // may manage lower-ranked roles within their own permissions
    const allowedUpdate = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${juniorRole.id}`,
      headers: session(manager.token),
      payload: { permissions: [{ action: 'read', subject: 'Role' }] }
    })
    expect(allowedUpdate.statusCode).toBe(200)

    const allowedCreate = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(manager.token),
      payload: { name: 'Reader', slug: 'reader', rank: 4, permissions: [{ action: 'read', subject: 'Role' }] }
    })
    expect(allowedCreate.statusCode).toBe(201)

    const allowedDelete = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/roles/${allowedCreate.json().id}`,
      headers: session(manager.token)
    })
    expect(allowedDelete.statusCode).toBe(204)
  })

  it('applies permission changes to affected users immediately', async () => {
    const superAdmin = await createUser('roles-dynamic-super@example.com', 'super_admin')

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: session(superAdmin.token),
      payload: { name: 'Auditor', slug: 'auditor', rank: 14, permissions: [{ action: 'read', subject: 'User' }] }
    })
    expect(created.statusCode).toBe(201)
    const auditorRole = created.json()

    const auditor = await createUser('roles-auditor@example.com', 'auditor')

    const allowed = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: session(auditor.token) })
    expect(allowed.statusCode).toBe(200)

    const revoked = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${auditorRole.id}`,
      headers: session(superAdmin.token),
      payload: { permissions: [] }
    })
    expect(revoked.statusCode).toBe(200)

    const denied = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: session(auditor.token) })
    expect(denied.statusCode).toBe(403)
  })

  it('rejects cross-site mutations on role endpoints', async () => {
    const superAdmin = await createUser('roles-csrf-super@example.com', 'super_admin')

    const crossSite = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: { ...session(superAdmin.token), 'origin': 'https://evil.example', 'sec-fetch-site': 'cross-site' },
      payload: { name: 'Evil', slug: 'evil', rank: 1 }
    })
    expect(crossSite.statusCode).toBe(403)
  })
})
