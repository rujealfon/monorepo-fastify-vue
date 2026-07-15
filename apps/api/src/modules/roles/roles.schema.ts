import { boolean, index, integer, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { permissionKeySchema, permissions, selectPermissionSchema } from '#api/modules/permissions/permissions.schema.js'
import { users } from '#api/modules/users/users.schema.js'

export const roles = pgTable('roles', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
})

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  primaryKey({ columns: [table.userId, table.roleId] }),
  index('user_roles_role_id_idx').on(table.roleId)
])

export const rolePermissions = pgTable('role_permissions', {
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  primaryKey({ columns: [table.roleId, table.permissionId] }),
  index('role_permissions_permission_id_idx').on(table.permissionId)
])

export const SUPER_ADMIN_SLUG = 'super-admin'
export const DEFAULT_ROLE_SLUG = 'standard-user'

const roleSlugSchema = z.string().trim().min(1).max(100).regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Slugs use lowercase kebab-case'
)

export const selectRoleSchema = createSelectSchema(roles, { id: schema => schema.positive() })
export type SelectRole = z.infer<typeof selectRoleSchema>

export const roleWithPermissionsSchema = selectRoleSchema.extend({
  permissions: z.array(selectPermissionSchema)
})

export const roleWithUserCountSchema = selectRoleSchema.extend({
  userCount: z.number().int().nonnegative()
})

export const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: roleSlugSchema,
  description: z.string().trim().max(500).nullable().optional()
}).meta({ examples: [{ name: 'Support Agent', slug: 'support-agent', description: 'Handles customer tickets' }] })
export type CreateRole = z.infer<typeof createRoleSchema>

export const patchRoleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable(),
  isActive: z.boolean()
}).partial().refine(role => Object.keys(role).length > 0, {
  message: 'At least one role field is required'
}).meta({ examples: [{ name: 'Support Agent', description: 'Handles customer tickets', isActive: true }] })
export type PatchRole = z.infer<typeof patchRoleSchema>

export const replaceRolePermissionsSchema = z.object({
  permissionIds: z.array(z.number().int().positive()).max(500)
}).meta({ examples: [{ permissionIds: [1, 2, 4] }] })
export type ReplaceRolePermissions = z.infer<typeof replaceRolePermissionsSchema>

export const replaceUserRolesSchema = z.object({
  roleIds: z.array(z.number().int().positive()).max(100)
}).meta({ examples: [{ roleIds: [2, 3] }] })
export type ReplaceUserRoles = z.infer<typeof replaceUserRolesSchema>

export const assignedRoleSchema = selectRoleSchema.pick({ id: true, name: true, slug: true })
export type AssignedRole = z.infer<typeof assignedRoleSchema>

export const usersPageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().min(1).max(254).optional()
}).meta({ examples: [{ page: 1, limit: 20, search: 'person@example.com' }] })
export type UsersPageQuery = z.infer<typeof usersPageQuerySchema>

export const userWithRolesSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  createdAt: z.date(),
  roles: z.array(assignedRoleSchema)
})

export const usersPageSchema = z.object({
  data: z.array(userWithRolesSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative()
  })
})

export const authorizationSchema = z.object({
  user: z.object({ id: z.uuid(), email: z.string() }),
  roles: z.array(assignedRoleSchema),
  permissions: z.array(permissionKeySchema),
  authorizationVersion: z.number().int().positive()
})
export type Authorization = z.infer<typeof authorizationSchema>
