import { bigint, index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { users } from '#api/modules/users/users.schema.js'

export const AUDIT_ACTIONS = [
  'task.created',
  'task.updated',
  'task.deleted',
  'role.created',
  'role.updated',
  'role.deleted',
  'role.permissions_replaced',
  'role.ability_rules_replaced',
  'ability_rule.created',
  'ability_rule.updated',
  'ability_rule.deleted',
  'user.roles_replaced',
  'user.registered',
  'profile.updated',
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'auth.permission_denied'
] as const
export const auditActionSchema = z.enum(AUDIT_ACTIONS)
export type AuditAction = z.infer<typeof auditActionSchema>

export const AUDIT_ENTITY_TYPES = ['task', 'role', 'user', 'ability_rule'] as const
export const auditEntityTypeSchema = z.enum(AUDIT_ENTITY_TYPES)
export type AuditEntityType = z.infer<typeof auditEntityTypeSchema>

export const auditLogs = pgTable('audit_logs', {
  id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: text('entity_id').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 255 }),
  requestId: varchar('request_id', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('audit_logs_actor_id_idx').on(table.actorId),
  index('audit_logs_action_idx').on(table.action),
  index('audit_logs_entity_type_idx').on(table.entityType),
  index('audit_logs_created_at_idx').on(table.createdAt)
])

export const auditLogWithActorSchema = createSelectSchema(auditLogs, {
  id: z.string().regex(/^[1-9]\d*$/),
  action: auditActionSchema,
  entityType: auditEntityTypeSchema,
  metadata: z.record(z.string(), z.unknown()).nullable()
}).extend({ actorEmail: z.string().nullable() }).partial().required({ id: true })
export type AuditLogWithActor = z.infer<typeof auditLogWithActorSchema>

export const auditLogsPageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  actorId: z.uuid().optional(),
  actorEmail: z.string().trim().min(1).max(254).optional(),
  action: auditActionSchema.optional(),
  entityType: auditEntityTypeSchema.optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional()
}).meta({ examples: [{ page: 1, limit: 20, action: 'task.created', entityType: 'task' }] })
export type AuditLogsPageQuery = z.infer<typeof auditLogsPageQuerySchema>

export const auditLogsPageSchema = z.object({
  data: z.array(auditLogWithActorSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative()
  })
})
