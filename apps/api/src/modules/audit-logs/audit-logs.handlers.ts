import type { FastifyRequest } from 'fastify'

import type { AuditLogsPageQuery } from './audit-logs.schema.js'
import * as auditService from './audit-logs.service.js'

export async function list(request: FastifyRequest<{ Querystring: AuditLogsPageQuery }>) {
  return auditService.listAuditLogs(request.query, request.authorization!)
}
