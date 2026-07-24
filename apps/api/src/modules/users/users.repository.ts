import type { DbExecutor } from '#api/modules/audit-logs'
import type { PatchProfile, RegisterUser } from './users.schema.js'

import { eq, sql } from 'drizzle-orm'

import { db } from '#api/db/index.js'
import { assignRoleBySlug, DEFAULT_ROLE_SLUG } from '#api/modules/roles'

import { profiles, users } from './users.schema.js'

function find(where: ReturnType<typeof eq>) {
  return db.select({ user: users, profile: profiles })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(where)
    .then(rows => rows.at(0))
}

export function findByEmail(email: string) {
  return find(eq(users.email, email))
}

export function findById(id: string) {
  return find(eq(users.id, id))
}

export function insert(data: Omit<RegisterUser, 'password'> & { passwordHash: string }) {
  return db.transaction(async (tx) => {
    const user = await tx.insert(users).values(data).returning().then(rows => rows[0])
    const profile = await tx.insert(profiles).values({ userId: user.id }).returning().then(rows => rows[0])
    await assignRoleBySlug(tx, user.id, DEFAULT_ROLE_SLUG)
    return { user, profile }
  })
}

export function updateProfile(id: string, data: PatchProfile, audit?: (tx: DbExecutor) => Promise<void>) {
  return db.transaction(async (tx) => {
    const profile = await tx.update(profiles).set(data).where(eq(profiles.userId, id)).returning().then(rows => rows.at(0))
    if (!profile)
      return undefined
    await tx.update(users)
      .set({ authorizationVersion: sql`${users.authorizationVersion} + 1` })
      .where(eq(users.id, id))
    if (audit)
      await audit(tx)
    const user = await tx.select().from(users).where(eq(users.id, id)).then(rows => rows.at(0))
    return user ? { user, profile } : undefined
  })
}
