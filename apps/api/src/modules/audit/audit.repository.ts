import type { AuditEventsQuery, NewAuditEvent } from './audit.schema.js'

import { and, count, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm'

import { config } from '#api/config/index.js'
import { db } from '#api/db/index.js'

import { auditEvents } from './audit.schema.js'

let lastCleanupDay = ''

export async function insert(event: NewAuditEvent) {
  await db.insert(auditEvents).values(event)
}

export async function insertDecision(event: NewAuditEvent) {
  await insert(event)
  const today = new Date().toISOString().slice(0, 10)
  if (lastCleanupDay === today)
    return
  lastCleanupDay = today
  await db.delete(auditEvents).where(and(
    eq(auditEvents.eventType, 'authorization.decision'),
    sql`${auditEvents.createdAt} < now() - (${config.AUDIT_DECISION_RETENTION_DAYS} * interval '1 day')`
  ))
}

export async function list(query: AuditEventsQuery) {
  const actorId = zodUuid(query.actor)
  const where = and(
    query.eventType ? eq(auditEvents.eventType, query.eventType) : undefined,
    query.outcome ? eq(auditEvents.outcome, query.outcome) : undefined,
    query.actor ? or(actorId ? eq(auditEvents.actorId, actorId) : undefined, ilike(auditEvents.actorEmail, `%${query.actor}%`)) : undefined,
    query.permission ? eq(auditEvents.permission, query.permission) : undefined,
    query.from ? gte(auditEvents.createdAt, query.from) : undefined,
    query.to ? lte(auditEvents.createdAt, query.to) : undefined
  )
  const [data, [{ total }]] = await Promise.all([
    db.select().from(auditEvents).where(where).orderBy(desc(auditEvents.createdAt), desc(auditEvents.id)).limit(query.limit).offset((query.page - 1) * query.limit),
    db.select({ total: count() }).from(auditEvents).where(where)
  ])
  return { data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }
}

function zodUuid(value?: string) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : undefined
}
