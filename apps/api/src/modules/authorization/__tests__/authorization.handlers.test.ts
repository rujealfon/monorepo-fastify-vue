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

describe('authorization administration routes', () => {
  let app: FastifyInstance
  let adminAuth: Record<string, string>
  let standardAuth: Record<string, string>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
    await db.execute(sql`delete from users`)

    const adminRegistration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'permissions-admin@example.com', password }
    })
    adminAuth = { cookie: cookie(adminRegistration) }
    const [adminRole] = await db.select().from(roles).where(eq(roles.slug, 'admin'))
    await db.insert(userRoles).values({ userId: adminRegistration.json().id, roleId: adminRole.id })

    const standardRegistration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'permissions-standard@example.com', password }
    })
    standardAuth = { cookie: cookie(standardRegistration) }
  })

  afterAll(async () => {
    await db.execute(sql`delete from users`)
    await app.close()
  })

  it('rejects unauthenticated requests', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ability-rules' })
    expect(response.statusCode).toBe(401)
  })

  it('forbids users without read AbilityRule', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ability-rules', headers: standardAuth })
    expect(response.statusCode).toBe(403)
  })

  it('lists the seeded ability rules for an admin', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ability-rules', headers: adminAuth })
    expect(response.statusCode).toBe(200)

    const keys = response.json().map((rule: { key: string }) => rule.key)
    expect(keys).toContain('system.manage_all')
    expect(keys).toContain('users.read')
    expect(keys).toContain('tasks.read_own')
  })
})
