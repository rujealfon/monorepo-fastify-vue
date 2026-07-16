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

describe('audit routes', () => {
  let app: FastifyInstance
  let adminAuth: Record<string, string>
  let standardAuth: Record<string, string>
  let adminUserId: string
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
    await db.execute(sql`truncate table tasks restart identity cascade`)
    await db.execute(sql`delete from users`)

    const adminUser = await register('audit-admin@example.com')
    adminAuth = adminUser.auth
    adminUserId = adminUser.id
    await promote(adminUser.id, 'admin')

    const standardUser = await register('audit-standard@example.com')
    standardAuth = standardUser.auth
    standardUserId = standardUser.id

    // registration itself is audited; start the assertions from a clean slate
    await db.execute(sql`delete from audit_logs`)
  })

  afterAll(async () => {
    await db.execute(sql`delete from audit_logs`)
    await db.execute(sql`truncate table tasks restart identity cascade`)
    await db.execute(sql`delete from users`)
    await app.close()
  })

  it('rejects unauthenticated requests', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/audit-logs' })
    expect(response.statusCode).toBe(401)
  })

  it('forbids users without the audit.read permission', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/audit-logs', headers: standardAuth })
    expect(response.statusCode).toBe(403)
  })

  it('records mutations and lists them for an admin', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: adminAuth,
      payload: { name: 'audited task' }
    })
    expect(createResponse.statusCode).toBe(201)
    const taskId = createResponse.json().id as number

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tasks/${taskId}`,
      headers: adminAuth,
      payload: { done: true }
    })
    expect(patchResponse.statusCode).toBe(200)

    const response = await app.inject({ method: 'GET', url: '/api/v1/audit-logs?entityType=task', headers: adminAuth })
    expect(response.statusCode).toBe(200)

    const body = response.json()
    expect(body.pagination).toMatchObject({ page: 1, limit: 20, total: 2 })
    expect(body.data[0]).toMatchObject({
      action: 'task.updated',
      entityType: 'task',
      entityId: String(taskId),
      actorId: adminUserId,
      actorEmail: 'audit-admin@example.com',
      metadata: { before: { done: false }, after: { done: true } }
    })
    expect(body.data[0].ipAddress).toBe('127.0.0.1')
    expect(body.data[0].userAgent).toBeTruthy()
    expect(body.data[0].requestId).toBeTruthy()
    expect(body.data[1].action).toBe('task.created')
  })

  it('filters by action and entity type', async () => {
    const filtered = await app.inject({ method: 'GET', url: '/api/v1/audit-logs?action=task.created', headers: adminAuth })
    expect(filtered.statusCode).toBe(200)
    expect(filtered.json().data).toHaveLength(1)
    expect(filtered.json().data[0].action).toBe('task.created')

    const none = await app.inject({ method: 'GET', url: '/api/v1/audit-logs?entityType=role', headers: adminAuth })
    expect(none.json().pagination.total).toBe(0)
  })

  it('paginates', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/audit-logs?page=2&limit=1&entityType=task', headers: adminAuth })
    expect(response.statusCode).toBe(200)

    const body = response.json()
    expect(body.pagination).toMatchObject({ page: 2, limit: 1, total: 2, totalPages: 2 })
    expect(body.data).toHaveLength(1)
  })

  it('records permission-denied attempts', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/audit-logs?action=auth.permission_denied', headers: adminAuth })
    expect(response.statusCode).toBe(200)

    const denied = response.json().data.find((event: { actorId: string | null }) => event.actorId === standardUserId)
    expect(denied).toMatchObject({
      entityType: 'user',
      entityId: standardUserId,
      actorEmail: 'audit-standard@example.com',
      metadata: { method: 'GET', url: '/api/v1/audit-logs', requiredPermissions: ['audit.read'] }
    })
  })

  it('records auth events', async () => {
    const failed = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'audit-admin@example.com', password: 'not the right password' }
    })
    expect(failed.statusCode).toBe(401)

    const success = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'audit-admin@example.com', password }
    })
    expect(success.statusCode).toBe(200)

    const logout = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: adminAuth })
    expect(logout.statusCode).toBe(204)

    const response = await app.inject({ method: 'GET', url: `/api/v1/audit-logs?entityType=user&actorId=${adminUserId}`, headers: adminAuth })
    expect(response.statusCode).toBe(200)

    const events = response.json().data as { action: string, actorId: string | null, metadata: Record<string, unknown> | null }[]
    expect(events.map(event => event.action)).toEqual(['auth.logout', 'auth.login', 'auth.login_failed'])
    expect(events[0].actorId).toBe(adminUserId)
    expect(events[1].actorId).toBe(adminUserId)
    expect(events[2]).toMatchObject({ actorId: adminUserId, metadata: { email: 'audit-admin@example.com' } })
  })

  it('records failed logins for unknown emails with no actor', async () => {
    const failed = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@example.com', password: 'whatever password 1' }
    })
    expect(failed.statusCode).toBe(401)

    const response = await app.inject({ method: 'GET', url: '/api/v1/audit-logs?action=auth.login_failed', headers: adminAuth })
    const unknown = response.json().data.find((event: { entityId: string }) => event.entityId === 'nobody@example.com')
    expect(unknown).toMatchObject({ actorId: null, actorEmail: null, metadata: { email: 'nobody@example.com' } })
  })

  it('returns 422 for an invalid query', async () => {
    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/audit-logs?action=nope', headers: adminAuth }),
      app.inject({ method: 'GET', url: '/api/v1/audit-logs?page=0', headers: adminAuth })
    ])
    expect(responses.map(response => response.statusCode)).toEqual([422, 422])
  })
})
