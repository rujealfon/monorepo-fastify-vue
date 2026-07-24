import type { AuthorizationContext } from '#api/modules/authorization'
import type { DbExecutor } from './audit-logs.repository.js'
import type { AuditAction, AuditEntityType, AuditLogsPageQuery } from './audit-logs.schema.js'

import { db } from '#api/db/index.js'
import { projectSubject } from '#api/modules/authorization'

import { getAuditRequestContext } from './audit-logs.context.js'
import * as repository from './audit-logs.repository.js'

export type AuditEvent = {
  actorId: string | null
  action: AuditAction
  entityType: AuditEntityType
  entityId: string | number
  metadata?: Record<string, unknown>
}

export async function recordAuditEvent(event: AuditEvent, executor: DbExecutor = db) {
  const context = getAuditRequestContext()
  await repository.insertAuditLog(executor, {
    ...event,
    entityId: String(event.entityId),
    ipAddress: context?.ip ?? null,
    userAgent: context?.userAgent ?? null,
    requestId: context?.requestId ?? null
  })
}

export async function listAuditLogs(query: AuditLogsPageQuery, caller?: AuthorizationContext) {
  const { page, limit, ...filters } = query
  const { data, total } = await repository.findAuditLogs(filters, page, limit, caller?.ability)
  return {
    data: caller ? data.map(log => projectSubject(caller.ability, 'AuditLog', log)) : data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  }
}
