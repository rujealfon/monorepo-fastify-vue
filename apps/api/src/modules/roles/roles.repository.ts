import type { CreateRole, UpdateRole } from './roles.schema.js'

import { asc, eq } from 'drizzle-orm'

import { db } from '#api/db/index.js'

import { rolePermissions, roles } from './roles.schema.js'

const permissionColumns = {
  action: rolePermissions.action,
  subject: rolePermissions.subject,
  conditions: rolePermissions.conditions
}

export async function findMany() {
  const [roleRows, permissionRows] = await Promise.all([
    db.select().from(roles).orderBy(asc(roles.rank)),
    db.select({ roleId: rolePermissions.roleId, ...permissionColumns }).from(rolePermissions)
  ])
  return roleRows.map(role => ({
    ...role,
    permissions: permissionRows
      .filter(permission => permission.roleId === role.id)
      .map(({ roleId: _, ...permission }) => permission)
  }))
}

export function findById(id: string) {
  return db.select().from(roles).where(eq(roles.id, id)).then(rows => rows.at(0))
}

export function findBySlug(slug: string) {
  return db.select().from(roles).where(eq(roles.slug, slug)).then(rows => rows.at(0))
}

export function findPermissions(roleId: string) {
  return db.select(permissionColumns).from(rolePermissions).where(eq(rolePermissions.roleId, roleId))
}

export function insert({ permissions, ...data }: CreateRole) {
  return db.transaction(async (tx) => {
    const role = await tx.insert(roles).values(data).returning().then(rows => rows[0])
    if (permissions.length)
      await tx.insert(rolePermissions).values(permissions.map(permission => ({ ...permission, roleId: role.id })))
    return { ...role, permissions: permissions.map(({ action, subject }) => ({ action, subject, conditions: null })) }
  })
}

export function update(id: string, { permissions, ...data }: UpdateRole) {
  return db.transaction(async (tx) => {
    const role = Object.keys(data).length
      ? await tx.update(roles).set(data).where(eq(roles.id, id)).returning().then(rows => rows.at(0))
      : await tx.select().from(roles).where(eq(roles.id, id)).then(rows => rows.at(0))
    if (!role)
      return undefined
    if (permissions) {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
      if (permissions.length)
        await tx.insert(rolePermissions).values(permissions.map(permission => ({ ...permission, roleId: id })))
    }
    const currentPermissions = await tx.select(permissionColumns).from(rolePermissions).where(eq(rolePermissions.roleId, id))
    return { ...role, permissions: currentPermissions }
  })
}

export function deleteById(id: string) {
  return db.delete(roles).where(eq(roles.id, id)).returning().then(rows => rows.at(0))
}
