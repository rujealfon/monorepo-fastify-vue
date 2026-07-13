import { boolean, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  rank: integer('rank').notNull(),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
})

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(),
  subject: varchar('subject', { length: 100 }).notNull(),
  conditions: jsonb('conditions').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  uniqueIndex('role_permissions_role_action_subject_idx').on(table.roleId, table.action, table.subject)
])

export const permissionRuleSchema = z.object({
  action: z.string().trim().min(1).max(50),
  subject: z.string().trim().min(1).max(100),
  conditions: z.record(z.string(), z.unknown()).nullable()
}).meta({ examples: [{ action: 'read', subject: 'User', conditions: null }] })
export type PermissionRule = z.infer<typeof permissionRuleSchema>

export const roleSchema = createSelectSchema(roles)

export const roleSummarySchema = roleSchema.pick({ id: true, slug: true, name: true, rank: true })
export type RoleSummary = z.infer<typeof roleSummarySchema>

export const roleWithPermissionsSchema = roleSchema.extend({
  permissions: z.array(permissionRuleSchema)
})
export type RoleWithPermissions = z.infer<typeof roleWithPermissionsSchema>

// Input rules are action/subject only: authorize() checks subject types, not
// resource instances, so CASL never evaluates `conditions` — accepting one
// would grant broader access than the rule reads. The column stays for when
// enforcement passes real instances.
export const permissionInputSchema = z.strictObject({
  action: permissionRuleSchema.shape.action,
  subject: permissionRuleSchema.shape.subject
})

export const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().regex(/^[a-z][a-z0-9_]*$/, 'Slug must be lowercase snake_case').max(100),
  rank: z.number().int().positive(),
  permissions: z.array(permissionInputSchema).default([])
}).meta({ examples: [{ name: 'Moderator', slug: 'moderator', rank: 15, permissions: [{ action: 'read', subject: 'User' }] }] })
export type CreateRole = z.infer<typeof createRoleSchema>

export const updateRoleSchema = createRoleSchema
  .pick({ name: true, rank: true, permissions: true })
  .partial()
  .refine(role => Object.keys(role).length > 0, { message: 'At least one role field is required' })
  .meta({ examples: [{ name: 'Moderator', permissions: [{ action: 'read', subject: 'User' }] }] })
export type UpdateRole = z.infer<typeof updateRoleSchema>
