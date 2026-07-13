import type { PatchProfile, RegisterUser } from './users.schema.js'

import { asc, count, eq, sql } from 'drizzle-orm'

import { db } from '#api/db/index.js'
import { roles } from '#api/modules/roles/roles.schema.js'

import { profiles, users } from './users.schema.js'

const permissionsAgg = sql<string[]>`coalesce((select array_agg(rp.permission) from role_permissions rp where rp.role_id = ${users.roleId}), '{}')`

const roleRef = {
  id: roles.id,
  name: roles.name,
  isSystem: roles.isSystem
}

function find(where: ReturnType<typeof eq>) {
  return db.select({ user: users, profile: profiles, role: roleRef, permissions: permissionsAgg })
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

export function findAuthById(id: string) {
  return db.select({
    roleId: roles.id,
    roleName: roles.name,
    isSystem: roles.isSystem,
    permissions: permissionsAgg
  })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.id, id))
    .then(rows => rows.at(0))
}

export async function findPage(page: number, limit: number) {
  const [data, [{ total }]] = await Promise.all([
    db.select({ user: users, role: roleRef })
      .from(users)
      .innerJoin(roles, eq(roles.id, users.roleId))
      .orderBy(asc(users.createdAt), asc(users.id))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(users)
  ])
  return { data, total }
}

export function updateRole(id: string, roleId: string) {
  return db.update(users).set({ roleId }).where(eq(users.id, id)).returning().then(rows => rows.at(0))
}

export function deleteById(id: string) {
  return db.delete(users).where(eq(users.id, id)).returning().then(rows => rows.at(0))
}

export function insert(data: Omit<RegisterUser, 'password'> & { passwordHash: string, roleId?: string }) {
  return db.transaction(async (tx) => {
    const user = await tx.insert(users).values({
      ...data,
      roleId: data.roleId ?? sql`(select id from roles where name = 'user')`
    }).returning().then(rows => rows[0])
    const profile = await tx.insert(profiles).values({ userId: user.id }).returning().then(rows => rows[0])
    return { user, profile }
  })
}

export async function updateProfile(id: string, data: PatchProfile) {
  const profile = await db.update(profiles).set(data).where(eq(profiles.userId, id)).returning().then(rows => rows.at(0))
  return profile && findById(id)
}
