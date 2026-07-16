import type { paths } from '../schema.js'

type AuditLogsPath = paths['/api/v1/audit-logs/']

export type AuditLogsPage = AuditLogsPath['get']['responses'][200]['content']['application/json']
export type AuditLog = AuditLogsPage['data'][number]
export type AuditLogsQuery = NonNullable<AuditLogsPath['get']['parameters']['query']>
export type AuditAction = NonNullable<AuditLogsQuery['action']>
export type AuditEntityType = NonNullable<AuditLogsQuery['entityType']>
