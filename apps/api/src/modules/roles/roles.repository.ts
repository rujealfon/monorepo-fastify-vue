import type { CreateRole, PatchRole } from './roles.schema.js'

import { and, asc, count, eq, ilike, inArray, ne, sql } from 'drizzle-orm'

import { db } from '#api/db/index.js'
import { permissions, WILDCARD_PERMISSION } from '#api/modules/permissions'
import { users } from '#api/modules/users/users.schema.js'

import { rolePermissions, roles, userRoles } from './roles.schema.js'

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

function bumpAuthorizationVersionForRole(tx: DbExecutor, roleId: number) {
  return tx.update(users)
    .set({ authorizationVersion: sql`${users.authorizationVersion} + 1` })
    .where(inArray(users.id, db.select({ id: userRoles.userId }).from(userRoles).where(eq(userRoles.roleId, roleId))))
}

export function findAuthorizationRows(userId: string) {
  return db.select({
    userId: users.id,
    email: users.email,
    authorizationVersion: users.authorizationVersion,
    roleId: roles.id,
    roleName: roles.name,
    roleSlug: roles.slug,
    permissionKey: permissions.key
  })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, and(eq(roles.id, userRoles.roleId), eq(roles.isActive, true)))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(users.id, userId))
}

export function findRoles() {
  return db.select().from(roles).orderBy(asc(roles.id))
}

export function findRolesByIds(ids: number[]) {
  if (ids.length === 0)
    return Promise.resolve([])
  return db.select().from(roles).where(inArray(roles.id, ids))
}

export function findRoleById(id: number) {
  return db.select().from(roles).where(eq(roles.id, id)).then(rows => rows.at(0))
}

export function findRolePermissions(roleId: number) {
  return db.select({ permission: permissions })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(rolePermissions.roleId, roleId))
    .orderBy(asc(permissions.resource), asc(permissions.action))
    .then(rows => rows.map(row => row.permission))
}

export async function findPermissionKeysByRoleIds(roleIds: number[]) {
  if (roleIds.length === 0)
    return []
  const rows = await db.selectDistinct({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(inArray(rolePermissions.roleId, roleIds))
  return rows.map(row => row.key)
}

export function insertRole(data: CreateRole) {
  return db.insert(roles).values(data).returning().then(rows => rows[0])
}

export function updateRoleById(id: number, data: PatchRole) {
  return db.transaction(async (tx) => {
    const role = await tx.update(roles).set(data).where(eq(roles.id, id)).returning().then(rows => rows.at(0))
    if (role && data.isActive !== undefined)
      await bumpAuthorizationVersionForRole(tx, id)
    return role
  })
}

export function deleteRoleById(id: number) {
  return db.transaction(async (tx) => {
    await bumpAuthorizationVersionForRole(tx, id)
    return tx.delete(roles).where(eq(roles.id, id)).returning().then(rows => rows.at(0))
  })
}

export function replaceRolePermissions(roleId: number, permissionIds: number[], assignedBy: string) {
  return db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
    if (permissionIds.length > 0)
      await tx.insert(rolePermissions).values(permissionIds.map(permissionId => ({ roleId, permissionId, assignedBy })))
    await bumpAuthorizationVersionForRole(tx, roleId)
  })
}

export async function findUsersWithRoles(page: number, limit: number, search?: string) {
  const where = search ? ilike(users.email, `%${search.replaceAll(/[%_\\]/g, String.raw`\$&`)}%`) : undefined

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
  return db.select({ id: users.id }).from(users).where(eq(users.id, userId)).then(rows => rows.at(0))
}

export function findUserRoles(userId: string) {
  return db.select({ role: roles })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId))
    .orderBy(asc(roles.id))
    .then(rows => rows.map(row => row.role))
}

export function replaceUserRoles(userId: string, roleIds: number[], assignedBy: string, protectWildcardAccess = false) {
  return db.transaction(async (tx) => {
    if (protectWildcardAccess) {
      await tx.execute(sql`select 1 from ${permissions} where ${permissions.key} = ${WILDCARD_PERMISSION} for update`)
      const otherWildcardHolder = await tx.select({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(and(ne(userRoles.userId, userId), eq(permissions.key, WILDCARD_PERMISSION)))
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
    return true
  })
}

export function countUsersWithRole(roleId: number) {
  return db.select({ total: count() })
    .from(userRoles)
    .where(eq(userRoles.roleId, roleId))
    .then(rows => rows[0].total)
}

export async function assignRoleBySlug(executor: DbExecutor, userId: string, slug: string) {
  const role = await executor.select({ id: roles.id }).from(roles).where(eq(roles.slug, slug)).then(rows => rows.at(0))
  if (!role)
    return
  await executor.insert(userRoles).values({ userId, roleId: role.id }).onConflictDoNothing()
}
