import type { PatchProfile, RegisterUser } from './users.schema.js'

import { eq } from 'drizzle-orm'

import { db } from '#api/db/index.js'

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
    return { user, profile }
  })
}

export async function updateProfile(id: string, data: PatchProfile) {
  const profile = await db.update(profiles).set(data).where(eq(profiles.userId, id)).returning().then(rows => rows.at(0))
  return profile && findById(id)
}
