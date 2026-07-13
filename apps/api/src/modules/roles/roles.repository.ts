import type { CreateRole, UpdateRole } from './roles.schema.js'

import { asc, eq, sql } from 'drizzle-orm'

import { db } from '#api/db/index.js'

import { rolePermissions, roles } from './roles.schema.js'

const permissionsAgg = sql<string[]>`coalesce(array_agg(${rolePermissions.permission}) filter (where ${rolePermissions.permission} is not null), '{}')`
const userCountAgg = sql<number>`(select count(*)::int from users u where u.role_id = ${roles.id})`

const roleSelection = {
  id: roles.id,
  name: roles.name,
  description: roles.description,
  isSystem: roles.isSystem,
  createdAt: roles.createdAt,
  updatedAt: roles.updatedAt,
  permissions: permissionsAgg,
  userCount: userCountAgg
}

export function findMany() {
  return db.select(roleSelection)
    .from(roles)
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .groupBy(roles.id)
    .orderBy(asc(roles.createdAt))
}

export function findById(id: string) {
  return db.select(roleSelection)
    .from(roles)
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(eq(roles.id, id))
    .groupBy(roles.id)
    .then(rows => rows.at(0))
}

export function findByName(name: string) {
  return db.select().from(roles).where(eq(roles.name, name)).then(rows => rows.at(0))
}

export function insert(data: CreateRole) {
  return db.transaction(async (tx) => {
    const [role] = await tx.insert(roles).values({ name: data.name, description: data.description ?? null }).returning()
    if (data.permissions.length)
      await tx.insert(rolePermissions).values(data.permissions.map(permission => ({ roleId: role.id, permission })))
    return role.id
  })
}

export function update(id: string, data: UpdateRole) {
  return db.transaction(async (tx) => {
    const { permissions, ...fields } = data
    if (Object.keys(fields).length)
      await tx.update(roles).set(fields).where(eq(roles.id, id))
    if (permissions) {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
      if (permissions.length)
        await tx.insert(rolePermissions).values(permissions.map(permission => ({ roleId: id, permission })))
    }
  })
}

export function deleteById(id: string) {
  return db.delete(roles).where(eq(roles.id, id)).returning().then(rows => rows.at(0))
}
