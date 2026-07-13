import type { PatchProfile, RegisterUser, Role } from './users.schema.js'

import { asc, count, eq } from 'drizzle-orm'

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

export function findRoleById(id: string) {
  return db.select({ role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .then(rows => rows.at(0)?.role)
}

export async function findPage(page: number, limit: number) {
  const [data, [{ total }]] = await Promise.all([
    db.select().from(users).orderBy(asc(users.createdAt), asc(users.id)).limit(limit).offset((page - 1) * limit),
    db.select({ total: count() }).from(users)
  ])
  return { data, total }
}

export function updateRole(id: string, role: Role) {
  return db.update(users).set({ role }).where(eq(users.id, id)).returning().then(rows => rows.at(0))
}

export function deleteById(id: string) {
  return db.delete(users).where(eq(users.id, id)).returning().then(rows => rows.at(0))
}

export function insert(data: Omit<RegisterUser, 'password'> & { passwordHash: string, role?: Role }) {
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
