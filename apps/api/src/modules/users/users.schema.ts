import { date, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
})

export const sexEnum = pgEnum('sex', ['male', 'female', 'intersex', 'prefer_not_to_say'])

export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  sex: sexEnum('sex'),
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
  sex: z.enum(sexEnum.enumValues).nullable(),
  birthDate: birthDateSchema,
  bio: z.string().trim().max(500).nullable()
}).partial().refine(profile => Object.keys(profile).length > 0, {
  message: 'At least one profile field is required'
}).meta({
  examples: [{
    firstName: 'Alex',
    lastName: 'Morgan',
    sex: 'prefer_not_to_say',
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
