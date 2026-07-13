import type { AppAbility } from '#api/modules/roles'
import type { PatchProfile } from './users.schema.js'

import { asc, count, eq } from 'drizzle-orm'

import { db } from '#api/db/index.js'
import { rolePermissions, roles } from '#api/modules/roles/roles.schema.js'

import { profiles, users } from './users.schema.js'

const roleSummaryColumns = {
  id: roles.id,
  slug: roles.slug,
  name: roles.name,
  rank: roles.rank
}

function find(where: ReturnType<typeof eq>) {
  return db.select({ user: users, profile: profiles, role: roleSummaryColumns })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(where)
    .then(rows => rows.at(0))
}

export function findByEmail(email: string) {
  return find(eq(users.email, email))
}

export function findById(id: string) {
  return find(eq(users.id, id))
}

export async function findActor(id: string) {
  const row = await db.select({ id: users.id, role: roleSummaryColumns })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.id, id))
    .then(rows => rows.at(0))
  if (!row)
    return undefined
  const permissions = await db
    .select({ action: rolePermissions.action, subject: rolePermissions.subject, conditions: rolePermissions.conditions })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, row.role.id))
  return { ...row, permissions }
}

export type Actor = NonNullable<Awaited<ReturnType<typeof findActor>>> & { ability: AppAbility }

export function insert(data: { email: string, passwordHash: string, roleId: string }) {
  return db.transaction(async (tx) => {
    const user = await tx.insert(users).values(data).returning().then(rows => rows[0])
    const profile = await tx.insert(profiles).values({ userId: user.id }).returning().then(rows => rows[0])
    const role = await tx.select(roleSummaryColumns).from(roles).where(eq(roles.id, data.roleId)).then(rows => rows[0])
    return { user, profile, role }
  })
}

export async function updateProfile(id: string, data: PatchProfile) {
  const profile = await db.update(profiles).set(data).where(eq(profiles.userId, id)).returning().then(rows => rows.at(0))
  return profile && findById(id)
}

export async function findPage(page: number, limit: number) {
  const [data, [{ total }]] = await Promise.all([
    db.select({ id: users.id, email: users.email, createdAt: users.createdAt, role: roleSummaryColumns })
      .from(users)
      .innerJoin(roles, eq(roles.id, users.roleId))
      .orderBy(asc(users.createdAt), asc(users.id))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(users)
  ])
  return { data, total }
}

export function findWithRole(id: string) {
  return db.select({ id: users.id, email: users.email, createdAt: users.createdAt, role: roleSummaryColumns })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.id, id))
    .then(rows => rows.at(0))
}

export async function updateRole(id: string, roleId: string) {
  const user = await db.update(users).set({ roleId }).where(eq(users.id, id)).returning().then(rows => rows.at(0))
  return user && findWithRole(id)
}

export function deleteById(id: string) {
  return db.delete(users).where(eq(users.id, id)).returning().then(rows => rows.at(0))
}
