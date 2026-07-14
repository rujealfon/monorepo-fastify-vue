import { boolean, index, pgTable, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { users } from '#api/modules/users'

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  done: boolean('done').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  index('tasks_user_id_idx').on(table.userId)
])

export const selectTasksSchema = createSelectSchema(tasks).extend({
  ownerEmail: z.string().email(),
  actions: z.object({ update: z.boolean(), delete: z.boolean() })
})
export type selectTasksSchema = z.infer<typeof selectTasksSchema>

export const tasksPageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
}).meta({ examples: [{ page: 1, limit: 20 }] })
export type TasksPageQuery = z.infer<typeof tasksPageQuerySchema>

export const tasksPageSchema = z.object({
  data: z.array(selectTasksSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative()
  })
})

export const insertTasksSchema = z.object({
  name: z.string().min(1).max(500),
  done: z.boolean().optional()
}).meta({ examples: [{ name: 'Ship authentication', done: false }] })
export type insertTasksSchema = z.infer<typeof insertTasksSchema>

export const patchTasksSchema = insertTasksSchema
  .partial()
  .refine(task => Object.keys(task).length > 0, { message: 'At least one task field is required' })
  .meta({ examples: [{ name: 'Ship authentication', done: true }] })
export type patchTasksSchema = z.infer<typeof patchTasksSchema>
