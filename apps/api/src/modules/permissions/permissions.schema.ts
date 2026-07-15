import { sql } from 'drizzle-orm'
import { boolean, check, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const permissions = pgTable('permissions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  key: varchar('key', { length: 150 }).notNull().unique(),
  resource: varchar('resource', { length: 100 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  check('valid_permission_key', sql`${table.key} = '*' OR ${table.key} ~ '^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$'`)
])

export const WILDCARD_PERMISSION = '*'

export type PermissionMode = 'all' | 'any'

export const permissionKeySchema = z.string().max(150).regex(
  /^(\*|[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+)$/,
  'Permission keys use the resource.action format'
)

export const selectPermissionSchema = createSelectSchema(permissions, { key: permissionKeySchema })
export type SelectPermission = z.infer<typeof selectPermissionSchema>
