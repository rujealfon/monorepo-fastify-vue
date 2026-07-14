import type { FastifyInstance } from 'fastify'

import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '#api/app.js'
import { db } from '#api/db/index.js'
import { roles } from '#api/modules/users/users.schema.js'
import { promoteByEmail } from '#api/modules/users/users.service.js'

const password = 'correct horse battery staple'

function cookie(response: { headers: Record<string, number | string | string[] | undefined> }) {
  return { cookie: String(response.headers['set-cookie']).split(';')[0] }
}

describe('dynamic RBAC routes', () => {
  let app: FastifyInstance
  let admin: Record<string, string>
  let member: Record<string, string>
  let adminId: string
  let memberId: string

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
    await db.execute(sql`truncate table users cascade`)
    await db.delete(roles).where(eq(roles.system, false))

    const adminRegistration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'admin@example.com', password }
    })
    const memberRegistration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'member@example.com', password }
    })
    admin = cookie(adminRegistration)
    member = cookie(memberRegistration)
    adminId = adminRegistration.json().id
    memberId = memberRegistration.json().id
    await promoteByEmail('admin@example.com')
  })

  afterAll(async () => app.close())

  it('enforces permissions and applies assignment changes to existing sessions', async () => {
    const forbidden = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: member })
    expect(forbidden.statusCode).toBe(403)

    const permissionsResponse = await app.inject({ method: 'GET', url: '/api/v1/admin/permissions', headers: admin })
    const permissions = permissionsResponse.json() as { id: string, key: string }[]
    const byKey = Object.fromEntries(permissions.map(permission => [permission.key, permission.id]))
    expect(permissionsResponse.statusCode).toBe(200)

    const roleResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: admin,
      payload: {
        name: 'task-reader',
        description: 'Can read tasks',
        permissionIds: [byKey['tasks.read']]
      }
    })
    expect(roleResponse.statusCode).toBe(201)
    const taskReader = roleResponse.json()

    const assignment = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${memberId}/roles`,
      headers: admin,
      payload: { roleIds: [taskReader.id] }
    })
    expect(assignment.statusCode, assignment.body).toBe(200)

    const read = await app.inject({ method: 'GET', url: '/api/v1/tasks', headers: member })
    const createDenied = await app.inject({ method: 'POST', url: '/api/v1/tasks', headers: member, payload: { name: 'denied' } })
    expect(read.statusCode).toBe(200)
    expect(createDenied.statusCode).toBe(403)

    const grantCreate = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${taskReader.id}`,
      headers: admin,
      payload: { permissionIds: [byKey['tasks.read'], byKey['tasks.create']] }
    })
    expect(grantCreate.statusCode).toBe(200)

    const create = await app.inject({ method: 'POST', url: '/api/v1/tasks', headers: member, payload: { name: 'allowed' } })
    expect(create.statusCode).toBe(201)
  })

  it('protects system roles, self assignment, assigned roles and the final admin', async () => {
    const rolesResponse = await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: admin })
    const allRoles = rolesResponse.json() as { id: string, name: string }[]
    const adminRole = allRoles.find(role => role.name === 'admin')!
    const taskReader = allRoles.find(role => role.name === 'task-reader')!

    const self = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${adminId}/roles`,
      headers: admin,
      payload: { roleIds: [] }
    })
    const patchSystem = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${adminRole.id}`,
      headers: admin,
      payload: { description: 'changed' }
    })
    const deleteAssigned = await app.inject({ method: 'DELETE', url: `/api/v1/admin/roles/${taskReader.id}`, headers: admin })
    expect([self.statusCode, patchSystem.statusCode, deleteAssigned.statusCode]).toEqual([403, 403, 409])

    const permissions = (await app.inject({ method: 'GET', url: '/api/v1/admin/permissions', headers: admin })).json() as { id: string, key: string }[]
    const manageUsers = permissions.find(permission => permission.key === 'users.roles.update')!
    const manager = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: admin,
      payload: { name: 'role-manager', permissionIds: [manageUsers.id] }
    })
    await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${memberId}/roles`,
      headers: admin,
      payload: { roleIds: [manager.json().id] }
    })

    const removeFinalAdmin = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${adminId}/roles`,
      headers: member,
      payload: { roleIds: [] }
    })
    expect(removeFinalAdmin.statusCode).toBe(409)
  })
})
