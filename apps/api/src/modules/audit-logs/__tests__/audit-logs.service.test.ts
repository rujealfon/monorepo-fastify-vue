import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db } from '#api/db/index.js'
import { listAuditLogs, recordAuditEvent } from '#api/modules/audit-logs/audit-logs.service.js'
import { createTestUsers } from '#api/test/user.fixtures.js'

describe('audit.service', () => {
  let actorId: string

  beforeAll(async () => {
    await db.execute(sql`delete from audit_logs`)
    await db.execute(sql`delete from users`)

    const [actor] = await createTestUsers(['audit-service-actor@example.com'])
    actorId = actor.id
  })

  afterAll(async () => {
    await db.execute(sql`delete from audit_logs`)
    await db.execute(sql`delete from users`)
    await db.$client.end()
  })

  it('records an event and stringifies numeric entity ids', async () => {
    await recordAuditEvent({ actorId, action: 'task.created', entityType: 'task', entityId: 42, metadata: { name: 'answer' } })

    const page = await listAuditLogs({ page: 1, limit: 10, action: 'task.created' })
    expect(page.data).toHaveLength(1)
    expect(page.data[0]).toMatchObject({ entityId: '42', actorEmail: 'audit-service-actor@example.com' })
  })

  it('participates in a transaction and rolls back with it', async () => {
    await expect(db.transaction(async (tx) => {
      await recordAuditEvent({ actorId, action: 'role.created', entityType: 'role', entityId: 1 }, tx)
      throw new Error('rollback')
    })).rejects.toThrow('rollback')

    const page = await listAuditLogs({ page: 1, limit: 10, action: 'role.created' })
    expect(page.pagination.total).toBe(0)

    await db.transaction(tx => recordAuditEvent({ actorId, action: 'role.deleted', entityType: 'role', entityId: 1 }, tx))
    const committed = await listAuditLogs({ page: 1, limit: 10, action: 'role.deleted' })
    expect(committed.pagination.total).toBe(1)
  })

  it('builds the pagination envelope', async () => {
    for (let index = 0; index < 3; index += 1)
      await recordAuditEvent({ actorId, action: 'task.updated', entityType: 'task', entityId: index })

    const page = await listAuditLogs({ page: 2, limit: 2, action: 'task.updated' })
    expect(page.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 })
    expect(page.data).toHaveLength(1)
  })
})
