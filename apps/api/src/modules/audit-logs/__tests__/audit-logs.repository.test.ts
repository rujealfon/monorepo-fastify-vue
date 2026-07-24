import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db } from '#api/db/index.js'
import * as auditRepository from '#api/modules/audit-logs/audit-logs.repository.js'
import { createTestUsers } from '#api/test/user.fixtures.js'

describe('audit.repository', () => {
  let actorId: string
  let otherActorId: string

  beforeAll(async () => {
    await db.execute(sql`delete from audit_logs`)
    await db.execute(sql`delete from users`)

    const [actor, otherActor] = await createTestUsers([
      'audit-repo-actor@example.com',
      'audit-repo-other@example.com'
    ])
    actorId = actor.id
    otherActorId = otherActor.id

    await auditRepository.insertAuditLog(db, { actorId, action: 'task.created', entityType: 'task', entityId: '1', metadata: { name: 'first' } })
    await auditRepository.insertAuditLog(db, { actorId, action: 'task.updated', entityType: 'task', entityId: '1', metadata: { changes: { done: true } } })
    await auditRepository.insertAuditLog(db, { actorId: otherActorId, action: 'role.created', entityType: 'role', entityId: '5' })
  })

  afterAll(async () => {
    await db.execute(sql`delete from audit_logs`)
    await db.execute(sql`delete from users`)
    await db.$client.end()
  })

  it('lists logs newest first with the actor email joined', async () => {
    const { data, total } = await auditRepository.findAuditLogs({}, 1, 10)
    expect(total).toBe(3)
    expect(data[0].id).toMatch(/^[1-9]\d*$/)
    expect(data[0].action).toBe('role.created')
    expect(data[0].actorEmail).toBe('audit-repo-other@example.com')
    expect(data.at(-1)?.action).toBe('task.created')
  })

  it('filters by action', async () => {
    const { data, total } = await auditRepository.findAuditLogs({ action: 'task.updated' }, 1, 10)
    expect(total).toBe(1)
    expect(data[0].metadata).toEqual({ changes: { done: true } })
  })

  it('filters by entity type and actor', async () => {
    const byEntity = await auditRepository.findAuditLogs({ entityType: 'task' }, 1, 10)
    expect(byEntity.total).toBe(2)

    const byActor = await auditRepository.findAuditLogs({ actorId: otherActorId }, 1, 10)
    expect(byActor.total).toBe(1)
    expect(byActor.data[0].entityId).toBe('5')
  })

  it('filters by actor email with escaped ilike', async () => {
    const { total } = await auditRepository.findAuditLogs({ actorEmail: 'audit-repo-actor' }, 1, 10)
    expect(total).toBe(2)

    const escaped = await auditRepository.findAuditLogs({ actorEmail: '%' }, 1, 10)
    expect(escaped.total).toBe(0)
  })

  it('filters by date range', async () => {
    const past = await auditRepository.findAuditLogs({ to: new Date(Date.now() - 60_000).toISOString() }, 1, 10)
    expect(past.total).toBe(0)

    const recent = await auditRepository.findAuditLogs({ from: new Date(Date.now() - 60_000).toISOString() }, 1, 10)
    expect(recent.total).toBe(3)
  })

  it('paginates', async () => {
    const { data, total } = await auditRepository.findAuditLogs({}, 2, 2)
    expect(total).toBe(3)
    expect(data).toHaveLength(1)
  })

  it('rejects in-place updates at the database level', async () => {
    await expect(db.execute(sql`update audit_logs set action = 'tampered'`))
      .rejects
      .toMatchObject({ cause: expect.objectContaining({ message: expect.stringContaining('immutable') }) })
  })

  it('keeps logs with a null actor after the user is deleted', async () => {
    await db.execute(sql`delete from users where id = ${otherActorId}`)

    const { data } = await auditRepository.findAuditLogs({ action: 'role.created' }, 1, 10)
    expect(data[0].actorId).toBeNull()
    expect(data[0].actorEmail).toBeNull()
  })
})
