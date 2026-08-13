import type { SessionIdentity } from './sessions.types.js'

import { and, eq, gt, lte } from 'drizzle-orm'

import { db } from '#api/db/index.js'

import { sessions } from './sessions.schema.js'

export function insert(userId: string, expiresAt: Date, now: Date) {
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

export function findActive(identity: SessionIdentity, now: Date) {
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

export function remove(identity: SessionIdentity) {
  return db.delete(sessions).where(and(
    eq(sessions.id, identity.id),
    eq(sessions.userId, identity.userId)
  ))
}
