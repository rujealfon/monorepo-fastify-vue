import type { FastifyInstance } from 'fastify'

import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '#api/app.js'
import { db } from '#api/db/index.js'
import { roles, userRoles } from '#api/modules/roles/roles.schema.js'

const password = 'correct horse battery staple'

function cookie(response: { headers: Record<string, number | string | string[] | undefined> }) {
  return String(response.headers['set-cookie']).split(';')[0]
}

describe('roles routes', () => {
  let app: FastifyInstance
  let superAuth: Record<string, string>
  let adminAuth: Record<string, string>
  let standardAuth: Record<string, string>
  let superUserId: string
  let standardUserId: string

  async function register(email: string) {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { email, password } })
    expect(response.statusCode).toBe(201)
    return { auth: { cookie: cookie(response) }, id: response.json().id as string }
  }

  async function promote(userId: string, slug: string) {
    const [role] = await db.select().from(roles).where(eq(roles.slug, slug))
    await db.insert(userRoles).values({ userId, roleId: role.id })
  }

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
    await db.execute(sql`delete from users`)

    const superUser = await register('roles-super@example.com')
    superAuth = superUser.auth
    superUserId = superUser.id
    await promote(superUser.id, 'super-admin')

    const adminUser = await register('roles-admin@example.com')
    adminAuth = adminUser.auth
    await promote(adminUser.id, 'admin')

    const standardUser = await register('roles-standard@example.com')
    standardAuth = standardUser.auth
    standardUserId = standardUser.id
  })

  afterAll(async () => {
    await db.execute(sql`delete from users`)
    await db.execute(sql`delete from roles where is_system = false`)
    await app.close()
  })

  it('rejects unauthenticated requests', async () => {
    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/me/authorization' }),
      app.inject({ method: 'GET', url: '/api/v1/roles' })
    ])
    expect(responses.map(response => response.statusCode)).toEqual([401, 401])
  })

  it('returns the authorization context for a standard user', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/me/authorization', headers: standardAuth })
    expect(response.statusCode).toBe(200)

    const body = response.json()
    expect(body.user.id).toBe(standardUserId)
    expect(body.roles.map((role: { slug: string }) => role.slug)).toEqual(['standard-user'])
    expect(body.permissions).toContain('profile.read_own')
    expect(body.permissions).toContain('tasks.read')
    expect(body.permissions).not.toContain('roles.read')
    expect(body.authorizationVersion).toBeGreaterThanOrEqual(1)
  })

  it('forbids role administration for users without the permissions', async () => {
    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/roles', headers: standardAuth }),
      app.inject({ method: 'POST', url: '/api/v1/roles', headers: adminAuth, payload: { name: 'Nope', slug: 'nope' } }),
      // authorization runs in onRequest, before validation: invalid body still gets 403, not 422
      app.inject({ method: 'POST', url: '/api/v1/roles', headers: adminAuth, payload: { slug: 'Bad Slug!' } })
    ])
    expect(responses.map(response => response.statusCode)).toEqual([403, 403, 403])
  })

  it('lets an admin read roles', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/roles', headers: adminAuth })
    expect(response.statusCode).toBe(200)
    expect(response.json().map((role: { slug: string }) => role.slug))
      .toEqual(expect.arrayContaining(['super-admin', 'admin', 'standard-user']))
  })

  it('lists users with their roles for an admin', async () => {
    const forbidden = await app.inject({ method: 'GET', url: '/api/v1/users', headers: standardAuth })
    expect(forbidden.statusCode).toBe(403)

    const response = await app.inject({ method: 'GET', url: '/api/v1/users', headers: adminAuth })
    expect(response.statusCode).toBe(200)

    const body = response.json()
    expect(body.pagination).toMatchObject({ page: 1, limit: 20, total: 3, totalPages: 1 })

    const standardRow = body.data.find((user: { id: string }) => user.id === standardUserId)
    expect(standardRow.roles.map((role: { slug: string }) => role.slug)).toEqual(['standard-user'])

    const superRow = body.data.find((user: { id: string }) => user.id === superUserId)
    expect(superRow.roles.map((role: { slug: string }) => role.slug)).toContain('super-admin')

    const searchResponse = await app.inject({ method: 'GET', url: '/api/v1/users?search=roles-standard', headers: adminAuth })
    expect(searchResponse.statusCode).toBe(200)
    expect(searchResponse.json().data).toHaveLength(1)
    expect(searchResponse.json().data[0].email).toBe('roles-standard@example.com')
  })

  it('rejects cross-site mutations', async () => {
    const headers = { ...superAuth, origin: 'https://evil.example' }
    const response = await app.inject({ method: 'POST', url: '/api/v1/roles', headers, payload: { name: 'Blocked', slug: 'blocked' } })
    expect(response.statusCode).toBe(403)
  })

  it('manages a role end to end as super admin', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: superAuth,
      payload: { name: 'Support', slug: 'support', description: 'Handles tickets' }
    })
    expect(createResponse.statusCode).toBe(201)
    const role = createResponse.json()
    expect(role).toMatchObject({ name: 'Support', slug: 'support', isSystem: false, permissions: [] })

    const conflictResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: superAuth,
      payload: { name: 'Support Two', slug: 'support' }
    })
    expect(conflictResponse.statusCode).toBe(409)

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${role.id}`,
      headers: superAuth,
      payload: { description: 'Customer support' }
    })
    expect(patchResponse.statusCode).toBe(200)
    expect(patchResponse.json().description).toBe('Customer support')

    const permissionsResponse = await app.inject({ method: 'GET', url: '/api/v1/permissions', headers: superAuth })
    const allPermissions = permissionsResponse.json() as { id: number, key: string }[]
    const profileRead = allPermissions.find(permission => permission.key === 'profile.read_own')!

    const assignResponse = await app.inject({
      method: 'PUT',
      url: `/api/v1/roles/${role.id}/permissions`,
      headers: superAuth,
      payload: { permissionIds: [profileRead.id] }
    })
    expect(assignResponse.statusCode).toBe(200)
    expect(assignResponse.json().permissions.map((permission: { key: string }) => permission.key)).toEqual(['profile.read_own'])

    const getResponse = await app.inject({ method: 'GET', url: `/api/v1/roles/${role.id}`, headers: superAuth })
    expect(getResponse.statusCode).toBe(200)
    expect(getResponse.json().permissions).toHaveLength(1)

    const deleteResponse = await app.inject({ method: 'DELETE', url: `/api/v1/roles/${role.id}`, headers: superAuth })
    expect(deleteResponse.statusCode).toBe(204)

    const goneResponse = await app.inject({ method: 'GET', url: `/api/v1/roles/${role.id}`, headers: superAuth })
    expect(goneResponse.statusCode).toBe(404)
  })

  it('protects system roles', async () => {
    const [superAdminRole] = await db.select().from(roles).where(eq(roles.slug, 'super-admin'))

    const deleteResponse = await app.inject({ method: 'DELETE', url: `/api/v1/roles/${superAdminRole.id}`, headers: superAuth })
    expect(deleteResponse.statusCode).toBe(403)

    const deactivateResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${superAdminRole.id}`,
      headers: superAuth,
      payload: { isActive: false }
    })
    expect(deactivateResponse.statusCode).toBe(403)

    const stripResponse = await app.inject({
      method: 'PUT',
      url: `/api/v1/roles/${superAdminRole.id}/permissions`,
      headers: superAuth,
      payload: { permissionIds: [] }
    })
    expect(stripResponse.statusCode).toBe(403)
  })

  it('replaces user roles, bumps the authorization version and blocks escalation', async () => {
    const before = await app.inject({ method: 'GET', url: '/api/v1/me/authorization', headers: standardAuth })
    const versionBefore = before.json().authorizationVersion as number

    const [standardRole] = await db.select().from(roles).where(eq(roles.slug, 'standard-user'))
    const [adminRole] = await db.select().from(roles).where(eq(roles.slug, 'admin'))
    const [superAdminRole] = await db.select().from(roles).where(eq(roles.slug, 'super-admin'))

    const escalationResponse = await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${standardUserId}/roles`,
      headers: adminAuth,
      payload: { roleIds: [superAdminRole.id] }
    })
    expect(escalationResponse.statusCode).toBe(403)

    const unknownResponse = await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${standardUserId}/roles`,
      headers: superAuth,
      payload: { roleIds: [999999] }
    })
    expect(unknownResponse.statusCode).toBe(400)

    const replaceResponse = await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${standardUserId}/roles`,
      headers: superAuth,
      payload: { roleIds: [standardRole.id, adminRole.id] }
    })
    expect(replaceResponse.statusCode).toBe(200)
    expect(replaceResponse.json().map((role: { slug: string }) => role.slug).sort()).toEqual(['admin', 'standard-user'])

    const listResponse = await app.inject({ method: 'GET', url: `/api/v1/users/${standardUserId}/roles`, headers: adminAuth })
    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json()).toHaveLength(2)

    const after = await app.inject({ method: 'GET', url: '/api/v1/me/authorization', headers: standardAuth })
    expect(after.json().authorizationVersion).toBe(versionBefore + 1)
    expect(after.json().permissions).toContain('roles.read')
  })

  it('never removes the last super admin', async () => {
    const [standardRole] = await db.select().from(roles).where(eq(roles.slug, 'standard-user'))

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${superUserId}/roles`,
      headers: superAuth,
      payload: { roleIds: [standardRole.id] }
    })
    expect(response.statusCode).toBe(409)
  })

  it('returns 404 for an unknown user or role', async () => {
    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/users/00000000-0000-4000-8000-000000000000/roles', headers: superAuth }),
      app.inject({ method: 'GET', url: '/api/v1/roles/999999', headers: superAuth })
    ])
    expect(responses.map(response => response.statusCode)).toEqual([404, 404])
  })

  it('returns 422 for an invalid role payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: superAuth,
      payload: { name: 'Bad Slug', slug: 'Bad Slug!' }
    })
    expect(response.statusCode).toBe(422)
  })
})
