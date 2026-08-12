import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { z } from 'zod'

import { users } from '#api/modules/users/users.schema.js'

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('sessions_user_id_idx').on(table.userId),
  index('sessions_expires_at_idx').on(table.expiresAt)
])

export const sessionClaimsSchema = z.object({
  sid: z.uuid(),
  sub: z.uuid()
})
export type SessionClaims = z.infer<typeof sessionClaimsSchema>
