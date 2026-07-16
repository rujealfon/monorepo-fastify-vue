import type { AuditAction, AuditEntityType } from './audit-logs.schema.js'

import { and, count, desc, eq, gte, ilike, lte } from 'drizzle-orm'

import { db } from '#api/db/index.js'
import { users } from '#api/modules/users/users.schema.js'

import { auditLogs } from './audit-logs.schema.js'

export type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export type InsertAuditLog = {
  actorId: string | null
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
  requestId?: string | null
}

export function insertAuditLog(executor: DbExecutor, values: InsertAuditLog) {
  return executor.insert(auditLogs).values(values)
}

export type AuditLogFilters = {
  actorId?: string
  actorEmail?: string
  action?: AuditAction
  entityType?: AuditEntityType
  from?: string
  to?: string
}

export async function findAuditLogs(filters: AuditLogFilters, page: number, limit: number) {
  const where = and(
    filters.actorId ? eq(auditLogs.actorId, filters.actorId) : undefined,
    filters.actorEmail ? ilike(users.email, `%${filters.actorEmail.replaceAll(/[%_\\]/g, String.raw`\$&`)}%`) : undefined,
    filters.action ? eq(auditLogs.action, filters.action) : undefined,
    filters.entityType ? eq(auditLogs.entityType, filters.entityType) : undefined,
    filters.from ? gte(auditLogs.createdAt, new Date(filters.from)) : undefined,
    filters.to ? lte(auditLogs.createdAt, new Date(filters.to)) : undefined
  )

  const [data, [{ total }]] = await Promise.all([
    db.select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      requestId: auditLogs.requestId,
      createdAt: auditLogs.createdAt,
      actorEmail: users.email
    })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(where)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(where)
  ])

  return { data, total }
}
