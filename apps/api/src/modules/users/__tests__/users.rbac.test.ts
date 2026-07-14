import type { FastifyInstance } from 'fastify'

import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '#api/app.js'
import { db } from '#api/db/index.js'
import { auditEvents } from '#api/modules/audit'
import { roles } from '#api/modules/users/users.schema.js'
import { promoteByEmail, resolveAuthorization } from '#api/modules/users/users.service.js'

const password = 'correct horse battery staple'
const own = { type: 'compare', field: 'task.ownerId', operator: 'eq', value: { type: 'field', field: 'actor.id' } } as const

function cookie(response: { headers: Record<string, number | string | string[] | undefined> }) {
  return { cookie: String(response.headers['set-cookie']).split(';')[0] }
}

describe('expression policy RBAC routes', () => {
  let app: FastifyInstance
  let admin: Record<string, string>
  let member: Record<string, string>
  let memberId: string
  let byKey: Record<string, string>
  let oldCreatedAt: Date

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
    await db.execute(sql`truncate table users cascade`)
    await db.delete(roles).where(eq(roles.system, false))
    const adminRegistration = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { email: 'admin@example.com', password } })
    const memberRegistration = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { email: 'member@example.com', password } })
    admin = cookie(adminRegistration)
    member = cookie(memberRegistration)
    memberId = memberRegistration.json().id
    await promoteByEmail('admin@example.com')
    oldCreatedAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
    await db.insert(auditEvents).values([
      { actorId: memberId, actorEmail: 'member@example.com', eventType: 'authorization.decision', outcome: 'deny', permission: 'tasks.read', createdAt: oldCreatedAt },
      { actorId: memberId, actorEmail: 'member@example.com', eventType: 'policy.changed', outcome: 'success', createdAt: oldCreatedAt }
    ])
    const catalog = (await app.inject({ method: 'GET', url: '/api/v1/admin/permissions', headers: admin })).json() as { id: string, key: string }[]
    byKey = Object.fromEntries(catalog.map(permission => [permission.key, permission.id]))
  })

  afterAll(async () => app.close())

  it('applies live role edits and deny-overrides across assigned roles', async () => {
    const role = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/roles',
      headers: admin,
      payload: {
        name: 'task-reader',
        permissionPolicies: [{ permissionId: byKey['tasks.read'], effect: 'allow', condition: own }]
      }
    })
    expect(role.statusCode, role.body).toBe(201)
    await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${memberId}/roles`,
      headers: admin,
      payload: { roleIds: [role.json().id] }
    })
    expect((await app.inject({ method: 'GET', url: '/api/v1/tasks', headers: member })).statusCode).toBe(200)
    expect((await app.inject({ method: 'POST', url: '/api/v1/tasks', headers: member, payload: { name: 'denied' } })).statusCode).toBe(403)

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/roles/${role.json().id}`,
      headers: admin,
      payload: { permissionPolicies: [
        { permissionId: byKey['tasks.read'], effect: 'allow', condition: own },
        { permissionId: byKey['tasks.create'], effect: 'allow', condition: null },
        {
          permissionId: byKey['tasks.create'],
          effect: 'deny',
          condition: { type: 'compare', field: 'actor.email', operator: 'eq', value: { type: 'literal', value: 'member@example.com' } }
        }
      ] }
    })
    expect(updated.statusCode, updated.body).toBe(200)
    expect((await app.inject({ method: 'POST', url: '/api/v1/tasks', headers: member, payload: { name: 'still denied' } })).statusCode).toBe(403)
    expect((await resolveAuthorization(memberId))?.policies).toHaveLength(3)
  })

  it('exposes supported fields and rejects invalid conditional policies', async () => {
    const catalog = (await app.inject({ method: 'GET', url: '/api/v1/admin/permissions', headers: admin })).json() as { key: string, conditionFields: string[] }[]
    expect(catalog.find(permission => permission.key === 'tasks.read')?.conditionFields).toContain('task.id')
    expect(catalog.find(permission => permission.key === 'tasks.create')?.conditionFields).not.toContain('task.id')
    expect(catalog.find(permission => permission.key === 'users.read')?.conditionFields).toEqual([])

    const invalid = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/v1/admin/roles',
        headers: admin,
        payload: { name: 'conditional-users', permissionPolicies: [{ permissionId: byKey['users.read'], effect: 'allow', condition: own }] }
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/admin/roles',
        headers: admin,
        payload: {
          name: 'create-by-id',
          permissionPolicies: [{
            permissionId: byKey['tasks.create'],
            effect: 'allow',
            condition: { type: 'compare', field: 'task.id', operator: 'eq', value: { type: 'literal', value: 1 } }
          }]
        }
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/admin/roles',
        headers: admin,
        payload: {
          name: 'duplicate-effect',
          permissionPolicies: [
            { permissionId: byKey['tasks.read'], effect: 'allow', condition: null },
            { permissionId: byKey['tasks.read'], effect: 'allow', condition: own }
          ]
        }
      })
    ])
    expect(invalid.map(response => response.statusCode)).toEqual([422, 422, 422])
  })

  it('lets the protected admin bypass every policy and deny', async () => {
    const profile = await app.inject({ method: 'GET', url: '/api/v1/profile', headers: admin })
    expect(profile.json().permissions).toContain('audit.read')
    expect(profile.json()).not.toHaveProperty('permissionScopes')
    expect((await app.inject({ method: 'POST', url: '/api/v1/tasks', headers: admin, payload: { name: 'admin task' } })).statusCode).toBe(201)
  })

  it('filters and paginates audit history while retaining policy changes', async () => {
    const denied = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit-events?permission=tasks.create&outcome=deny&actor=member@example.com',
      headers: admin
    })
    expect(denied.statusCode, denied.body).toBe(200)
    expect(denied.json().data).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventType: 'authorization.decision', permission: 'tasks.create', outcome: 'deny' })
    ]))
    expect(denied.json().data.some((event: { matchedDenyPolicyIds: string[] }) => event.matchedDenyPolicyIds.length > 0)).toBe(true)

    const page = await app.inject({ method: 'GET', url: '/api/v1/admin/audit-events?page=1&limit=1&eventType=role.created', headers: admin })
    expect(page.json()).toMatchObject({ data: [{ eventType: 'role.created' }], pagination: { page: 1, limit: 1 } })

    const oldEvents = await db.select({ eventType: auditEvents.eventType }).from(auditEvents).where(eq(auditEvents.createdAt, oldCreatedAt))
    expect(oldEvents).not.toContainEqual({ eventType: 'authorization.decision' })
    expect(oldEvents).toContainEqual({ eventType: 'policy.changed' })
  })

  it('rolls back audited mutations but does not block decisions when audit writes fail', async () => {
    await db.execute(sql`
      create function reject_selected_audit_events() returns trigger as $$
      begin
        if new.event_type in ('role.created', 'authorization.decision') then
          raise exception 'forced audit failure';
        end if;
        return new;
      end;
      $$ language plpgsql
    `)
    await db.execute(sql`
      create trigger reject_selected_audit_events_trigger
      before insert on audit_events
      for each row execute function reject_selected_audit_events()
    `)
    try {
      const mutation = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/roles',
        headers: admin,
        payload: { name: 'must-rollback', permissionPolicies: [] }
      })
      expect(mutation.statusCode).toBe(500)
      expect(await db.select().from(roles).where(eq(roles.name, 'must-rollback'))).toHaveLength(0)

      const decision = await app.inject({ method: 'GET', url: '/api/v1/profile', headers: admin })
      expect(decision.statusCode).toBe(200)
    }
    finally {
      await db.execute(sql`drop trigger reject_selected_audit_events_trigger on audit_events`)
      await db.execute(sql`drop function reject_selected_audit_events()`)
    }
  })
})
