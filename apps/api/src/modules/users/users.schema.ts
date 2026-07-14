import { boolean, date, index, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'
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
  'permissions.read',
  'audit.read'
] as const

export const TASK_PERMISSION_KEYS = ['tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete'] as const
export const POLICY_FIELDS = [
  'actor.id',
  'actor.email',
  'actor.roles',
  'task.id',
  'task.ownerId',
  'task.ownerEmail',
  'task.name',
  'task.done'
] as const
export const POLICY_OPERATORS = ['eq', 'neq', 'in', 'notIn', 'contains', 'startsWith', 'endsWith'] as const

export const policyEffectEnum = pgEnum('policy_effect', ['allow', 'deny'])

export type PolicyField = typeof POLICY_FIELDS[number]
export type PolicyOperator = typeof POLICY_OPERATORS[number]
export type PolicyExpression
  = | { type: 'all' | 'any', children: PolicyExpression[] }
    | { type: 'not', child: PolicyExpression }
    | {
      type: 'compare'
      field: PolicyField
      operator: PolicyOperator
      value: { type: 'literal', value: unknown } | { type: 'field', field: PolicyField }
    }

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

export const rolePolicies = pgTable('role_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'restrict' }),
  effect: policyEffectEnum('effect').notNull(),
  condition: jsonb('condition').$type<PolicyExpression | null>()
}, table => [
  unique('role_policies_role_permission_effect_unique').on(table.roleId, table.permissionId, table.effect),
  index('role_policies_permission_id_idx').on(table.permissionId),
  index('role_policies_role_id_idx').on(table.roleId)
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
export const taskPermissionKeySchema = z.enum(TASK_PERMISSION_KEYS)
export type TaskPermissionKey = z.infer<typeof taskPermissionKeySchema>
export const policyEffectSchema = z.enum(policyEffectEnum.enumValues)
export type PolicyEffect = z.infer<typeof policyEffectSchema>
export const policyFieldSchema = z.enum(POLICY_FIELDS)
export const policyOperatorSchema = z.enum(POLICY_OPERATORS)

export const policyExpressionSchema: z.ZodType<PolicyExpression> = z.lazy(() => z.discriminatedUnion('type', [
  z.object({ type: z.enum(['all', 'any']), children: z.array(policyExpressionSchema).min(1).max(10) }).strict(),
  z.object({ type: z.literal('not'), child: policyExpressionSchema }).strict(),
  z.object({
    type: z.literal('compare'),
    field: policyFieldSchema,
    operator: policyOperatorSchema,
    value: z.discriminatedUnion('type', [
      z.object({ type: z.literal('literal'), value: z.unknown() }).strict(),
      z.object({ type: z.literal('field'), field: policyFieldSchema }).strict()
    ])
  }).strict()
])).meta({ id: 'PolicyExpression' })

export function isTaskPermissionKey(key: PermissionKey): key is TaskPermissionKey {
  return TASK_PERMISSION_KEYS.includes(key as TaskPermissionKey)
}

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

export const permissionSchema = createSelectSchema(permissions, { key: permissionKeySchema }).extend({
  conditionFields: z.array(policyFieldSchema)
})
export type Permission = z.infer<typeof permissionSchema>

export const roleSummarySchema = z.object({ id: z.uuid(), name: z.string(), system: z.boolean() })
export const rolePolicySchema = createSelectSchema(rolePolicies, {
  effect: policyEffectSchema,
  condition: policyExpressionSchema.nullable()
}).extend({ permission: createSelectSchema(permissions, { key: permissionKeySchema }) })
export const roleSchema = createSelectSchema(roles).extend({ policies: z.array(rolePolicySchema) })
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

const permissionPoliciesSchema = z.array(z.object({
  permissionId: z.uuid(),
  effect: policyEffectSchema,
  condition: policyExpressionSchema.nullable()
})).refine(policies => new Set(policies.map(policy => `${policy.permissionId}:${policy.effect}`)).size === policies.length, {
  message: 'Each permission can have at most one allow and one deny policy'
})

export const createRoleSchema = z.object({
  name: roleNameSchema,
  description: roleDescriptionSchema.optional(),
  permissionPolicies: permissionPoliciesSchema
})
export type CreateRole = z.infer<typeof createRoleSchema>

export const patchRoleSchema = createRoleSchema.partial().refine(role => Object.keys(role).length > 0, {
  message: 'At least one role field is required'
})
export type PatchRole = z.infer<typeof patchRoleSchema>
