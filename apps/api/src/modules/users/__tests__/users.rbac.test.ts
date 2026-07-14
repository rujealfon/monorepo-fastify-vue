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
  let victimId: string
  let attackerId: string
  let attacker: Record<string, string>
  let tampererRoleId: string

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
    expect(removeFinalAdmin.statusCode).toBe(403)
  })

  it('prevents a non-admin holder of users.roles.update from granting a system role', async () => {
    const victimRegistration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'victim@example.com', password }
    })
    victimId = victimRegistration.json().id

    const rolesResponse = await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: admin })
    const allRoles = rolesResponse.json() as { id: string, name: string }[]
    const adminRole = allRoles.find(role => role.name === 'admin')!

    const escalate = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${victimId}/roles`,
      headers: member,
      payload: { roleIds: [adminRole.id] }
    })
    expect(escalate.statusCode).toBe(403)

    const victim = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: admin })
    const victimUser = (victim.json().data as { id: string, roles: { name: string }[] }[]).find(user => user.id === victimId)!
    expect(victimUser.roles.some(role => role.name === 'admin')).toBe(false)
  })

  it('prevents a non-admin holder of roles.update from tampering with the default user role permissions', async () => {
    const attackerRegistration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'role-tamperer@example.com', password }
    })
    attackerId = attackerRegistration.json().id
    attacker = cookie(attackerRegistration)

    const rolesResponse = await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: admin })
    const allRoles = rolesResponse.json() as { id: string, name: string }[]
    const userRole = allRoles.find(role => role.name === 'user')!

    const permissions = (await app.inject({ method: 'GET', url: '/api/v1/admin/permissions', headers: admin })).json() as { id: string, key: string }[]
    const rolesUpdate = permissions.find(permission => permission.key === 'roles.update')!
    const rolesReader = permissions.find(permission => permission.key === 'roles.read')!
    const tamperer = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: admin,
      payload: { name: 'role-tamperer', permissionIds: [rolesUpdate.id, rolesReader.id] }
    })
    tampererRoleId = tamperer.json().id
    await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${attackerId}/roles`,
      headers: admin,
      payload: { roleIds: [tampererRoleId] }
    })

    const escalate = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${userRole.id}`,
      headers: attacker,
      payload: { permissionIds: [rolesUpdate.id, rolesReader.id] }
    })
    expect(escalate.statusCode).toBe(403)

    const rolesAfter = (await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: admin })).json() as { id: string, permissions: { key: string }[] }[]
    const userRoleAfter = rolesAfter.find(role => role.id === userRole.id)!
    expect(userRoleAfter.permissions.some(permission => permission.key === 'roles.update')).toBe(false)
  })

  it('lets a non-admin holder of users.roles.update keep a target\'s existing system role while adding a custom role', async () => {
    // member holds the "role-manager" custom role (users.roles.update only) from an earlier test in this suite.
    const targetRegistration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'delegation-target@example.com', password }
    })
    const targetId = targetRegistration.json().id

    const rolesResponse = await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: admin })
    const allRoles = rolesResponse.json() as { id: string, name: string }[]
    const userRole = allRoles.find(role => role.name === 'user')!
    const taskReader = allRoles.find(role => role.name === 'task-reader')!
    const adminRole = allRoles.find(role => role.name === 'admin')!

    const keepUserRole = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${targetId}/roles`,
      headers: member,
      payload: { roleIds: [userRole.id, taskReader.id] }
    })
    expect(keepUserRole.statusCode, keepUserRole.body).toBe(200)
    expect((keepUserRole.json().roles as { name: string }[]).map(role => role.name).sort()).toEqual(['task-reader', 'user'])

    const grantNewSystemRole = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${targetId}/roles`,
      headers: member,
      payload: { roleIds: [userRole.id, adminRole.id] }
    })
    expect(grantNewSystemRole.statusCode).toBe(403)
  })

  it('prevents a non-admin holder of users.roles.update from removing a target\'s existing system role', async () => {
    // member holds the "role-manager" custom role (users.roles.update only) from an earlier test in this suite.
    // victim (from an earlier test) still holds only the default "user" system role.
    const rolesResponse = await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: admin })
    const allRoles = rolesResponse.json() as { id: string, name: string }[]
    const taskReader = allRoles.find(role => role.name === 'task-reader')!

    const stripSystemRole = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${victimId}/roles`,
      headers: member,
      payload: { roleIds: [taskReader.id] }
    })
    expect(stripSystemRole.statusCode).toBe(403)

    const target = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: admin })
    const targetUser = (target.json().data as { id: string, roles: { name: string }[] }[]).find(user => user.id === victimId)!
    expect(targetUser.roles.some(role => role.name === 'user')).toBe(true)
  })

  it('prevents a non-admin holder of roles.update from granting their own custom role permissions they do not hold', async () => {
    // attacker (from an earlier test) holds the "role-tamperer" custom role (roles.update + roles.read only).
    const permissions = (await app.inject({ method: 'GET', url: '/api/v1/admin/permissions', headers: admin })).json() as { id: string, key: string }[]
    const rolesUpdate = permissions.find(permission => permission.key === 'roles.update')!
    const rolesReader = permissions.find(permission => permission.key === 'roles.read')!
    const manageUsers = permissions.find(permission => permission.key === 'users.roles.update')!

    const escalate = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${tampererRoleId}`,
      headers: attacker,
      payload: { permissionIds: [rolesUpdate.id, rolesReader.id, manageUsers.id] }
    })
    expect(escalate.statusCode).toBe(403)

    const rolesAfter = (await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: admin })).json() as { id: string, permissions: { key: string }[] }[]
    const tampererRoleAfter = rolesAfter.find(role => role.id === tampererRoleId)!
    expect(tampererRoleAfter.permissions.some(permission => permission.key === 'users.roles.update')).toBe(false)
  })

  it('prevents a non-admin holder of roles.create from creating a role with permissions they do not hold', async () => {
    const permissions = (await app.inject({ method: 'GET', url: '/api/v1/admin/permissions', headers: admin })).json() as { id: string, key: string }[]
    const rolesCreate = permissions.find(permission => permission.key === 'roles.create')!
    const manageUsers = permissions.find(permission => permission.key === 'users.roles.update')!

    const creatorRole = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: admin,
      payload: { name: 'role-creator', permissionIds: [rolesCreate.id] }
    })
    // member (from an earlier test) is reassigned here since no later test depends on its prior role.
    await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${memberId}/roles`,
      headers: admin,
      payload: { roleIds: [creatorRole.json().id] }
    })

    const escalate = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: member,
      payload: { name: 'self-granted-role', permissionIds: [manageUsers.id] }
    })
    expect(escalate.statusCode).toBe(403)

    const rolesAfter = (await app.inject({ method: 'GET', url: '/api/v1/admin/roles', headers: admin })).json() as { name: string }[]
    expect(rolesAfter.some(role => role.name === 'self-granted-role')).toBe(false)
  })
})
