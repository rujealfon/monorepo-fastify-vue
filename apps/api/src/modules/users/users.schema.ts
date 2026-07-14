import { boolean, date, index, pgEnum, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const PERMISSION_KEYS = [
  'profile.read',
  'profile.update',
  'tasks.read',
  'tasks.create',
  'tasks.update',
  'tasks.delete',
  'users.read',
  'users.roles.update',
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
  'permissions.read'
] as const

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
})

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 64 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  system: boolean('system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
})

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 64, enum: PERMISSION_KEYS }).notNull().unique(),
  description: varchar('description', { length: 255 }).notNull()
})

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'restrict' })
}, table => [
  primaryKey({ columns: [table.userId, table.roleId] }),
  index('user_roles_role_id_idx').on(table.roleId)
])

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'restrict' })
}, table => [
  primaryKey({ columns: [table.roleId, table.permissionId] }),
  index('role_permissions_permission_id_idx').on(table.permissionId)
])

export const genderEnum = pgEnum('gender', ['male', 'female', 'intersex', 'prefer_not_to_say'])

export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  gender: genderEnum('gender'),
  birthDate: date('birth_date', { mode: 'string' }),
  bio: text('bio'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
})

const emailSchema = z.string().trim().toLowerCase().max(254).email()
const nameSchema = z.string().trim().min(1).max(100).nullable()
const birthDateSchema = z.iso.date().nullable()

export const permissionKeySchema = z.enum(PERMISSION_KEYS)
export type PermissionKey = z.infer<typeof permissionKeySchema>

const roleNameSchema = z.string().trim().toLowerCase().min(2).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const roleDescriptionSchema = z.string().trim().max(255).nullable()
const uniqueUuidArraySchema = z.array(z.uuid()).refine(ids => new Set(ids).size === ids.length, {
  message: 'Role and permission IDs must be unique'
})

export const registerUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(12).max(128)
}).meta({ examples: [{ email: 'person@example.com', password: 'correct horse battery staple' }] })
export type RegisterUser = z.infer<typeof registerUserSchema>

export const loginUserSchema = registerUserSchema
  .pick({ email: true, password: true })
  .meta({ examples: [{ email: 'person@example.com', password: 'correct horse battery staple' }] })
export type LoginUser = z.infer<typeof loginUserSchema>

export const patchProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  gender: z.enum(genderEnum.enumValues).nullable(),
  birthDate: birthDateSchema,
  bio: z.string().trim().max(500).nullable()
}).partial().refine(profile => Object.keys(profile).length > 0, {
  message: 'At least one profile field is required'
}).meta({
  examples: [{
    firstName: 'Alex',
    lastName: 'Morgan',
    gender: 'prefer_not_to_say',
    birthDate: '1990-05-20',
    bio: 'Building useful things with TypeScript.'
  }]
})
export type PatchProfile = z.infer<typeof patchProfileSchema>

export const publicProfileSchema = createSelectSchema(profiles, {
  firstName: nameSchema,
  lastName: nameSchema,
  birthDate: birthDateSchema,
  bio: z.string().max(500).nullable()
}).omit({ userId: true })

export const publicUserSchema = createSelectSchema(users)
  .omit({ passwordHash: true })
  .extend({
    profile: publicProfileSchema,
    roles: z.array(z.object({ id: z.uuid(), name: z.string(), system: z.boolean() })),
    permissions: z.array(permissionKeySchema)
  })
export type PublicUser = z.infer<typeof publicUserSchema>

export const permissionSchema = createSelectSchema(permissions, { key: permissionKeySchema })
export type Permission = z.infer<typeof permissionSchema>

export const roleSummarySchema = z.object({ id: z.uuid(), name: z.string(), system: z.boolean() })
export const roleSchema = createSelectSchema(roles).extend({ permissions: z.array(permissionSchema) })
export type Role = z.infer<typeof roleSchema>

export const managedUserSchema = createSelectSchema(users)
  .omit({ passwordHash: true })
  .extend({ roles: z.array(roleSummarySchema) })

export const usersPageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
})
export type UsersPageQuery = z.infer<typeof usersPageQuerySchema>

export const usersPageSchema = z.object({
  data: z.array(managedUserSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative()
  })
})

export const replaceUserRolesSchema = z.object({ roleIds: uniqueUuidArraySchema })
export type ReplaceUserRoles = z.infer<typeof replaceUserRolesSchema>

export const createRoleSchema = z.object({
  name: roleNameSchema,
  description: roleDescriptionSchema.optional(),
  permissionIds: uniqueUuidArraySchema
})
export type CreateRole = z.infer<typeof createRoleSchema>

export const patchRoleSchema = createRoleSchema.partial().refine(role => Object.keys(role).length > 0, {
  message: 'At least one role field is required'
})
export type PatchRole = z.infer<typeof patchRoleSchema>
