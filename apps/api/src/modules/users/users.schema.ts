import { date, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// value order is the role hierarchy: index = rank
export const roleEnum = pgEnum('role', ['user', 'admin', 'super_admin'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: roleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
})

export const roleSchema = z.enum(roleEnum.enumValues)
export type Role = z.infer<typeof roleSchema>

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
  .extend({ profile: publicProfileSchema })
export type PublicUser = z.infer<typeof publicUserSchema>

export const adminUserSchema = createSelectSchema(users).omit({ passwordHash: true })
export type AdminUser = z.infer<typeof adminUserSchema>

export const usersPageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
}).meta({ examples: [{ page: 1, limit: 20 }] })
export type UsersPageQuery = z.infer<typeof usersPageQuerySchema>

export const usersPageSchema = z.object({
  data: z.array(adminUserSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative()
  })
})

export const changeRoleSchema = z.object({ role: roleSchema })
  .meta({ examples: [{ role: 'admin' }] })
export type ChangeRole = z.infer<typeof changeRoleSchema>

export const userIdParamsSchema = z.object({ id: z.uuid() })
export type UserIdParams = z.infer<typeof userIdParamsSchema>
