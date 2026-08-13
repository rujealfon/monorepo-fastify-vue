import type { PatchProfile, RegisterUser } from './users.schema.js'
import { eq } from 'drizzle-orm'

import { db } from '#api/db/index.js'

import { DuplicateEmailError } from './users.errors.js'
import { profiles, users } from './users.schema.js'

// Postgres SQLSTATE for a unique-constraint violation (users.email is unique).
// drizzle-orm wraps the driver's error in a `cause`.
const UNIQUE_VIOLATION = '23505'

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

export async function insert(data: Omit<RegisterUser, 'password'> & { passwordHash: string }) {
  try {
    return await db.transaction(async (tx) => {
      const user = await tx.insert(users).values(data).returning().then(rows => rows[0])
      const profile = await tx.insert(profiles).values({ userId: user.id }).returning().then(rows => rows[0])
      return { user, profile }
    })
  }
  catch (error) {
    const cause = typeof error === 'object' && error && 'cause' in error ? error.cause : error
    if (typeof cause === 'object' && cause && 'code' in cause && cause.code === UNIQUE_VIOLATION)
      throw new DuplicateEmailError({ cause: error })
    throw error
  }
}

export async function updateProfile(id: string, data: PatchProfile) {
  const profile = await db.update(profiles).set(data).where(eq(profiles.userId, id)).returning().then(rows => rows.at(0))
  return profile && findById(id)
}
