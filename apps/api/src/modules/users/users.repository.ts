import type { CreateRole, PatchProfile, PatchRole, PermissionKey, RegisterUser } from './users.schema.js'

import { and, asc, count, eq, inArray, or, sql } from 'drizzle-orm'

import { db } from '#api/db/index.js'

import { PERMISSION_KEYS, permissions, profiles, rolePermissions, roles, userRoles, users } from './users.schema.js'

export type RoleWriteResult = 'missing-permission' | 'missing-role' | 'protected-role' | 'role-assigned'
export type UserRolesWriteResult = 'last-admin' | 'missing-role' | 'missing-user'

async function authorization(userId: string) {
  const assignedRoles = await db.select({ id: roles.id, name: roles.name, system: roles.system })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId))
    .orderBy(asc(roles.name))

  if (assignedRoles.some(role => role.name === 'admin'))
    return { roles: assignedRoles, permissions: [...PERMISSION_KEYS] }

  const granted = await db.selectDistinct({ key: permissions.key })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(userRoles.userId, userId))
    .orderBy(asc(permissions.key))

  return { roles: assignedRoles, permissions: granted.map(permission => permission.key as PermissionKey) }
}

async function find(where: ReturnType<typeof eq>) {
  const row = await db.select({ user: users, profile: profiles })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(where)
    .then(rows => rows.at(0))

  return row && { ...row, ...await authorization(row.user.id) }
}

export function findByEmail(email: string) {
  return find(eq(users.email, email))
}

export function findById(id: string) {
  return find(eq(users.id, id))
}

export async function insert(data: Omit<RegisterUser, 'password'> & { passwordHash: string }) {
  const userId = await db.transaction(async (tx) => {
    const user = await tx.insert(users).values(data).returning().then(rows => rows[0])
    const profile = await tx.insert(profiles).values({ userId: user.id }).returning().then(rows => rows[0])
    const role = await tx.select({ id: roles.id }).from(roles).where(eq(roles.name, 'user')).then(rows => rows[0])
    if (!role)
      throw new Error('Default user role is missing')
    await tx.insert(userRoles).values({ userId: user.id, roleId: role.id })
    return profile.userId
  })

  return findById(userId).then(user => user!)
}

export async function updateProfile(id: string, data: PatchProfile) {
  const profile = await db.update(profiles).set(data).where(eq(profiles.userId, id)).returning().then(rows => rows.at(0))
  return profile && findById(id)
}

export async function hasPermission(userId: string, permission: PermissionKey) {
  const granted = await db.select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(and(
      eq(userRoles.userId, userId),
      or(eq(roles.name, 'admin'), eq(permissions.key, permission))
    ))
    .limit(1)
  if (granted.length)
    return true

  const user = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
  return user.length ? false : undefined
}

export async function listUsers(page: number, limit: number) {
  const [data, [{ total }]] = await Promise.all([
    db.select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).orderBy(asc(users.createdAt), asc(users.id)).limit(limit).offset((page - 1) * limit),
    db.select({ total: count() }).from(users)
  ])

  const assigned = data.length
    ? await db.select({ userId: userRoles.userId, id: roles.id, name: roles.name, system: roles.system })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(inArray(userRoles.userId, data.map(user => user.id)))
        .orderBy(asc(roles.name))
    : []

  return {
    data: data.map(user => ({ ...user, roles: assigned.filter(role => role.userId === user.id).map(({ userId: _, ...role }) => role) })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  }
}

export async function findManagedUser(id: string) {
  const user = await db.select({
    id: users.id,
    email: users.email,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt
  }).from(users).where(eq(users.id, id)).then(rows => rows[0])
  if (!user)
    return

  const assigned = await db.select({ id: roles.id, name: roles.name, system: roles.system })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, id))
    .orderBy(asc(roles.name))
  return { ...user, roles: assigned }
}

export async function replaceUserRoles(userId: string, roleIds: string[]): Promise<UserRolesWriteResult | undefined> {
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('rbac-admin-role'))`)

    const user = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).then(rows => rows[0])
    if (!user)
      return 'missing-user' as const

    const selectedRoles = roleIds.length
      ? await tx.select({ id: roles.id, name: roles.name }).from(roles).where(inArray(roles.id, roleIds))
      : []
    if (selectedRoles.length !== roleIds.length)
      return 'missing-role' as const

    const adminRole = await tx.select({ id: roles.id }).from(roles).where(eq(roles.name, 'admin')).then(rows => rows[0])
    const currentlyAdmin = adminRole && await tx.select({ userId: userRoles.userId }).from(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, adminRole.id))).then(rows => rows.length > 0)
    const remainsAdmin = selectedRoles.some(role => role.name === 'admin')

    if (adminRole && currentlyAdmin && !remainsAdmin) {
      const [{ total }] = await tx.select({ total: count() }).from(userRoles).where(eq(userRoles.roleId, adminRole.id))
      if (total <= 1)
        return 'last-admin' as const
    }

    await tx.delete(userRoles).where(eq(userRoles.userId, userId))
    if (roleIds.length)
      await tx.insert(userRoles).values(roleIds.map(roleId => ({ userId, roleId })))
  })

  return result
}

export async function listPermissions() {
  return db.select().from(permissions).orderBy(asc(permissions.key))
}

export async function listRoles() {
  const [allRoles, allPermissions, assigned] = await Promise.all([
    db.select().from(roles).orderBy(asc(roles.name)),
    listPermissions(),
    db.select({ roleId: rolePermissions.roleId, permission: permissions })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .orderBy(asc(permissions.key))
  ])

  return allRoles.map(role => ({
    ...role,
    permissions: role.name === 'admin'
      ? allPermissions
      : assigned.filter(item => item.roleId === role.id).map(item => item.permission)
  }))
}

export async function createRole(data: CreateRole) {
  const roleId = await db.transaction(async (tx) => {
    const selected = data.permissionIds.length
      ? await tx.select({ id: permissions.id }).from(permissions).where(inArray(permissions.id, data.permissionIds))
      : []
    if (selected.length !== data.permissionIds.length)
      return 'missing-permission' as const

    const role = await tx.insert(roles).values({ name: data.name, description: data.description }).returning().then(rows => rows[0])
    if (data.permissionIds.length) {
      await tx.insert(rolePermissions).values(data.permissionIds.map(permissionId => ({ roleId: role.id, permissionId })))
    }
    return role.id
  })

  return roleId === 'missing-permission' ? roleId : listRoles().then(items => items.find(role => role.id === roleId)!)
}

export async function updateRole(id: string, data: PatchRole) {
  const result = await db.transaction(async (tx) => {
    const role = await tx.select().from(roles).where(eq(roles.id, id)).then(rows => rows[0])
    if (!role)
      return 'missing-role' as const
    if (role.name === 'admin' || (role.name === 'user' && data.name && data.name !== 'user'))
      return 'protected-role' as const

    if (data.permissionIds) {
      const selected = data.permissionIds.length
        ? await tx.select({ id: permissions.id }).from(permissions).where(inArray(permissions.id, data.permissionIds))
        : []
      if (selected.length !== data.permissionIds.length)
        return 'missing-permission' as const
    }

    const { permissionIds, ...changes } = data
    if (Object.keys(changes).length)
      await tx.update(roles).set(changes).where(eq(roles.id, id))

    if (permissionIds) {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
      if (permissionIds.length)
        await tx.insert(rolePermissions).values(permissionIds.map(permissionId => ({ roleId: id, permissionId })))
    }
    return id
  })

  return typeof result === 'string' && ['missing-role', 'protected-role', 'missing-permission'].includes(result)
    ? result as RoleWriteResult
    : listRoles().then(items => items.find(role => role.id === id)!)
}

export async function deleteRole(id: string): Promise<RoleWriteResult | undefined> {
  return db.transaction(async (tx) => {
    const role = await tx.select({ name: roles.name }).from(roles).where(eq(roles.id, id)).then(rows => rows[0])
    if (!role)
      return 'missing-role'
    if (role.name === 'admin' || role.name === 'user')
      return 'protected-role'
    const assigned = await tx.select({ userId: userRoles.userId }).from(userRoles).where(eq(userRoles.roleId, id)).limit(1)
    if (assigned.length)
      return 'role-assigned'
    await tx.delete(roles).where(eq(roles.id, id))
  })
}

export async function promoteByEmail(email: string) {
  const [user, role] = await Promise.all([
    db.select({ id: users.id }).from(users).where(eq(users.email, email)).then(rows => rows[0]),
    db.select({ id: roles.id }).from(roles).where(eq(roles.name, 'admin')).then(rows => rows[0])
  ])
  if (!user || !role)
    return false
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id }).onConflictDoNothing()
  return true
}
