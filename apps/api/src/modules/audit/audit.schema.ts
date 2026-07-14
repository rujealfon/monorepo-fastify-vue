import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id'),
  actorEmail: varchar('actor_email', { length: 254 }).notNull(),
  eventType: varchar('event_type', { length: 64 }).notNull(),
  outcome: varchar('outcome', { length: 16 }).notNull(),
  permission: varchar('permission', { length: 64 }),
  resourceType: varchar('resource_type', { length: 64 }),
  resourceId: varchar('resource_id', { length: 128 }),
  matchedAllowPolicyIds: uuid('matched_allow_policy_ids').array().notNull().default([]),
  matchedDenyPolicyIds: uuid('matched_deny_policy_ids').array().notNull().default([]),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('audit_events_created_at_idx').on(table.createdAt),
  index('audit_events_event_type_created_at_idx').on(table.eventType, table.createdAt),
  index('audit_events_actor_id_idx').on(table.actorId),
  index('audit_events_permission_idx').on(table.permission)
])

export const auditEventSchema = createSelectSchema(auditEvents, {
  permission: z.string().max(64).nullable(),
  details: z.record(z.string(), z.unknown())
})

export const auditEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  eventType: z.string().max(64).optional(),
  outcome: z.string().max(16).optional(),
  actor: z.string().max(254).optional(),
  permission: z.string().max(64).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
}).refine(query => !query.from || !query.to || query.from <= query.to, { message: 'from must not be after to' })
export type AuditEventsQuery = z.infer<typeof auditEventsQuerySchema>

export const auditEventsPageSchema = z.object({
  data: z.array(auditEventSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative()
  })
})

export type NewAuditEvent = typeof auditEvents.$inferInsert
