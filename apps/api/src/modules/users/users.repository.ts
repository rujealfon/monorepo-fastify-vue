import type { PatchProfile, RegisterUser } from './users.schema.js'
import type { SessionIdentity } from './users.types.js'

import { and, eq, gt, lte } from 'drizzle-orm'

import { db } from '#api/db/index.js'

import { profiles, sessions, users } from './users.schema.js'

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
    return { user, profile }
  })
}

export async function updateProfile(id: string, data: PatchProfile) {
  const profile = await db.update(profiles).set(data).where(eq(profiles.userId, id)).returning().then(rows => rows.at(0))
  return profile && findById(id)
}

export function createSession(userId: string, expiresAt: Date, now: Date) {
  return db.transaction(async (tx) => {
    // Each login creates an independent device Session. Expired Sessions are
    // swept globally here while the expected volume remains small.
    await tx.delete(sessions).where(lte(sessions.expiresAt, now))

    return tx.insert(sessions)
      .values({ userId, expiresAt })
      .returning({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt })
      .then(rows => rows[0])
  })
}

export function findActiveSession(identity: SessionIdentity, now: Date) {
  return db.select({ id: sessions.id })
    .from(sessions)
    .where(and(
      eq(sessions.id, identity.id),
      eq(sessions.userId, identity.userId),
      gt(sessions.expiresAt, now)
    ))
    .limit(1)
    .then(rows => rows.at(0))
}

export function deleteSession(identity: SessionIdentity) {
  return db.delete(sessions).where(and(
    eq(sessions.id, identity.id),
    eq(sessions.userId, identity.userId)
  ))
}
