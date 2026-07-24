import type { DbExecutor } from '#api/modules/audit-logs'
import type { AppAbility } from '#api/modules/authorization'
import type { CreateRole, PatchRole } from './roles.schema.js'

import { and, asc, count, eq, ilike, inArray, ne, sql } from 'drizzle-orm'

import { db } from '#api/db/index.js'
import { rulesToDrizzleWhere } from '#api/modules/authorization'
import { users } from '#api/modules/users/users.schema.js'

import { roles, SUPER_ADMIN_SLUG, userRoles } from './roles.schema.js'

type AuditCallback = (tx: DbExecutor) => Promise<void>

function bumpAuthorizationVersionForRole(tx: DbExecutor, roleId: number) {
  return tx.update(users)
    .set({ authorizationVersion: sql`${users.authorizationVersion} + 1` })
    .where(inArray(users.id, db.select({ id: userRoles.userId }).from(userRoles).where(eq(userRoles.roleId, roleId))))
}

export function findRoles(ability?: AppAbility) {
  return db.select({
    id: roles.id,
    name: roles.name,
    slug: roles.slug,
    description: roles.description,
    isSystem: roles.isSystem,
    isActive: roles.isActive,
    createdAt: roles.createdAt,
    updatedAt: roles.updatedAt,
    userCount: count(userRoles.userId)
  })
    .from(roles)
    .leftJoin(userRoles, eq(userRoles.roleId, roles.id))
    .where(ability ? rulesToDrizzleWhere(ability, 'read', 'Role') : undefined)
    .groupBy(roles.id)
    .orderBy(asc(roles.id))
}

export function findRolesByIds(ids: number[]) {
  if (ids.length === 0)
    return Promise.resolve([])
  return db.select().from(roles).where(inArray(roles.id, ids))
}

export function findRoleById(id: number) {
  return db.select().from(roles).where(eq(roles.id, id)).then(rows => rows.at(0))
}

export function insertRole(data: CreateRole) {
  return db.insert(roles).values(data).returning().then(rows => rows[0])
}

export function updateRoleById(id: number, data: PatchRole, audit?: AuditCallback) {
  return db.transaction(async (tx) => {
    const role = await tx.update(roles).set(data).where(eq(roles.id, id)).returning().then(rows => rows.at(0))
    if (role && data.isActive !== undefined)
      await bumpAuthorizationVersionForRole(tx, id)
    if (role && audit)
      await audit(tx)
    return role
  })
}

export function deleteRoleById(id: number, audit?: AuditCallback) {
  return db.transaction(async (tx) => {
    await bumpAuthorizationVersionForRole(tx, id)
    const role = await tx.delete(roles).where(eq(roles.id, id)).returning().then(rows => rows.at(0))
    if (role && audit)
      await audit(tx)
    return role
  })
}

export async function findUsersWithRoles(page: number, limit: number, search?: string, ability?: AppAbility) {
  const where = and(
    ability ? rulesToDrizzleWhere(ability, 'read', 'User') : undefined,
    search ? ilike(users.email, `%${search.replaceAll(/[%_\\]/g, String.raw`\$&`)}%`) : undefined
  )

  const [data, [{ total }]] = await Promise.all([
    db.select({ id: users.id, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(where)
      .orderBy(asc(users.email))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(users).where(where)
  ])

  const userIds = data.map(user => user.id)
  const assignments = userIds.length === 0
    ? []
    : await db.select({ userId: userRoles.userId, id: roles.id, name: roles.name, slug: roles.slug })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(inArray(userRoles.userId, userIds))
        .orderBy(asc(roles.id))

  return {
    data: data.map(user => ({
      ...user,
      roles: assignments
        .filter(assignment => assignment.userId === user.id)
        .map(({ id, name, slug }) => ({ id, name, slug }))
    })),
    total
  }
}

export function findUserById(userId: string) {
  return db.select({ id: users.id, email: users.email, createdAt: users.createdAt, updatedAt: users.updatedAt })
    .from(users)
    .where(eq(users.id, userId))
    .then(rows => rows.at(0))
}

export function findUserRoles(userId: string) {
  return db.select({ role: roles })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId))
    .orderBy(asc(roles.id))
    .then(rows => rows.map(row => row.role))
}

export function replaceUserRoles(userId: string, roleIds: number[], assignedBy: string, protectWildcardAccess = false, audit?: AuditCallback) {
  return db.transaction(async (tx) => {
    if (protectWildcardAccess) {
      await tx.execute(sql`select 1 from ${roles} where ${roles.slug} = ${SUPER_ADMIN_SLUG} for update`)
      const otherWildcardHolder = await tx.select({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(and(ne(userRoles.userId, userId), eq(roles.slug, SUPER_ADMIN_SLUG)))
        .limit(1)
        .then(rows => rows.at(0))
      if (!otherWildcardHolder)
        return false
    }

    await tx.delete(userRoles).where(eq(userRoles.userId, userId))
    if (roleIds.length > 0)
      await tx.insert(userRoles).values(roleIds.map(roleId => ({ userId, roleId, assignedBy })))
    await tx.update(users)
      .set({ authorizationVersion: sql`${users.authorizationVersion} + 1` })
      .where(eq(users.id, userId))
    if (audit)
      await audit(tx)
    return true
  })
}

export async function assignRoleBySlug(executor: DbExecutor, userId: string, slug: string) {
  const role = await executor.select({ id: roles.id }).from(roles).where(eq(roles.slug, slug)).then(rows => rows.at(0))
  if (!role)
    return
  await executor.insert(userRoles).values({ userId, roleId: role.id }).onConflictDoNothing()
}
