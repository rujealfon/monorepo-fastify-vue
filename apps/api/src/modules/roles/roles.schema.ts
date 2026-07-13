import { boolean, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const PERMISSIONS = ['users:read', 'users:manage', 'roles:read', 'roles:manage'] as const

export const permissionSchema = z.enum(PERMISSIONS)
export type Permission = z.infer<typeof permissionSchema>

export const PERMISSION_CATALOG = [
  {
    group: 'Users',
    permissions: [
      { value: 'users:read', label: 'View users', description: 'List user accounts' },
      { value: 'users:manage', label: 'Manage users', description: 'Assign roles to users and delete accounts' }
    ]
  },
  {
    group: 'Roles',
    permissions: [
      { value: 'roles:read', label: 'View roles', description: 'List roles and the permission catalog' },
      { value: 'roles:manage', label: 'Manage roles', description: 'Create, edit and delete roles' }
    ]
  }
] as const satisfies readonly { group: string, permissions: readonly { value: Permission, label: string, description: string }[] }[]

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
})

// permission is text, not a pg enum: the catalog lives in code, so it can grow without a migration
export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permission: text('permission').notNull()
}, table => [
  primaryKey({ columns: [table.roleId, table.permission] })
])

export const roleRefSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  isSystem: z.boolean()
})
export type RoleRef = z.infer<typeof roleRefSchema>

export const roleSchema = createSelectSchema(roles).extend({
  permissions: z.array(permissionSchema),
  userCount: z.number().int().nonnegative()
})
export type Role = z.infer<typeof roleSchema>

export const rolesListSchema = z.object({ data: z.array(roleSchema) })

const roleNameSchema = z.string().trim().min(1).max(50)
const roleDescriptionSchema = z.string().trim().max(255).nullable()

export const createRoleSchema = z.object({
  name: roleNameSchema,
  description: roleDescriptionSchema.optional(),
  permissions: z.array(permissionSchema).default([])
}).meta({ examples: [{ name: 'support', description: 'Read-only user access', permissions: ['users:read'] }] })
export type CreateRole = z.infer<typeof createRoleSchema>

export const updateRoleSchema = z.object({
  name: roleNameSchema,
  description: roleDescriptionSchema,
  permissions: z.array(permissionSchema)
}).partial().refine(patch => Object.keys(patch).length > 0, {
  message: 'At least one role field is required'
}).meta({ examples: [{ permissions: ['users:read', 'users:manage'] }] })
export type UpdateRole = z.infer<typeof updateRoleSchema>

export const roleIdParamsSchema = z.object({ id: z.uuid() })
export type RoleIdParams = z.infer<typeof roleIdParamsSchema>

export const permissionCatalogSchema = z.object({
  data: z.array(z.object({
    group: z.string(),
    permissions: z.array(z.object({
      value: permissionSchema,
      label: z.string(),
      description: z.string()
    }))
  }))
})
