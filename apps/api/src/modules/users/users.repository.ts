import type { CreateRole, PatchProfile, PatchRole, PermissionKey, RegisterUser } from './users.schema.js'

import { and, asc, count, eq, inArray, sql } from 'drizzle-orm'

import { db } from '#api/db/index.js'
import { auditEvents } from '#api/modules/audit'

import { conditionFieldsFor, validatePolicyExpression } from './users.policy.js'
import { isTaskPermissionKey, PERMISSION_KEYS, permissions, profiles, rolePolicies, roles, userRoles, users } from './users.schema.js'

export type RoleWriteResult = 'invalid-policy' | 'missing-permission' | 'missing-role' | 'protected-role' | 'role-assigned'
export type UserRolesWriteResult = 'last-admin' | 'missing-role' | 'missing-user'

export async function resolveAuthorization(userId: string) {
  const [user, assignedRoles] = await Promise.all([
    db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).then(rows => rows[0]),
    db.select({ id: roles.id, name: roles.name, system: roles.system })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId))
      .orderBy(asc(roles.name))
  ])
  if (!user)
    return

  const admin = assignedRoles.some(role => role.name === 'admin')
  const assignedPolicies = admin
    ? []
    : await db.select({
        id: rolePolicies.id,
        permission: permissions.key,
        effect: rolePolicies.effect,
        condition: rolePolicies.condition
      })
        .from(userRoles)
        .innerJoin(rolePolicies, eq(rolePolicies.roleId, userRoles.roleId))
        .innerJoin(permissions, eq(permissions.id, rolePolicies.permissionId))
        .where(eq(userRoles.userId, userId))
        .orderBy(asc(permissions.key), asc(rolePolicies.effect), asc(rolePolicies.id))

  return {
    actor: { id: user.id, email: user.email, roles: assignedRoles.map(role => role.name) },
    admin,
    policies: assignedPolicies.map(policy => ({ ...policy, permission: policy.permission as PermissionKey })),
    roles: assignedRoles
  }
}

async function authorization(userId: string) {
  const resolved = await resolveAuthorization(userId)
  if (!resolved)
    throw new Error('User disappeared while resolving authorization')
  const effective = resolved.admin
    ? [...PERMISSION_KEYS]
    : [...new Set(resolved.policies
        .filter(policy => policy.effect === 'allow'
          && (policy.condition === null || validatePolicyExpression(policy.condition, policy.permission).success))
        .map(policy => policy.permission))]
  return { roles: resolved.roles, permissions: effective }
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

export async function replaceUserRoles(actorId: string, userId: string, roleIds: string[]): Promise<UserRolesWriteResult | undefined> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('rbac-admin-role'))`)
    const actor = await tx.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, actorId)).then(rows => rows[0])
    if (!actor)
      throw new Error('Audit actor is missing')
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
    await tx.insert(auditEvents).values({
      actorId: actor.id,
      actorEmail: actor.email,
      eventType: 'user.roles.replaced',
      outcome: 'success',
      resourceType: 'user',
      resourceId: userId,
      details: { roleIds }
    })
  })
}

export async function listPermissions() {
  return db.select().from(permissions).orderBy(asc(permissions.key)).then(items => items.map(permission => ({
    ...permission,
    conditionFields: conditionFieldsFor(permission.key as PermissionKey)
  })))
}

export async function listRoles() {
  const [allRoles, assigned] = await Promise.all([
    db.select().from(roles).orderBy(asc(roles.name)),
    db.select({ roleId: rolePolicies.roleId, policy: rolePolicies, permission: permissions })
      .from(rolePolicies)
      .innerJoin(permissions, eq(permissions.id, rolePolicies.permissionId))
      .orderBy(asc(permissions.key), asc(rolePolicies.effect))
  ])

  return allRoles.map(role => ({
    ...role,
    policies: assigned.filter(item => item.roleId === role.id).map(item => ({ ...item.policy, permission: item.permission }))
  }))
}

function validPermissionPolicies(selected: Map<string, PermissionKey>, policies: CreateRole['permissionPolicies']) {
  return policies.every((policy) => {
    const key = selected.get(policy.permissionId)
    if (!key)
      return false
    if (!isTaskPermissionKey(key))
      return policy.condition === null
    return policy.condition === null || validatePolicyExpression(policy.condition, key).success
  })
}

async function auditActor(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], actorId: string) {
  const actor = await tx.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, actorId)).then(rows => rows[0])
  if (!actor)
    throw new Error('Audit actor is missing')
  return actor
}

export async function createRole(actorId: string, data: CreateRole) {
  const roleId = await db.transaction(async (tx) => {
    const actor = await auditActor(tx, actorId)
    const permissionIds = [...new Set(data.permissionPolicies.map(policy => policy.permissionId))]
    const selected = permissionIds.length
      ? await tx.select({ id: permissions.id, key: permissions.key }).from(permissions).where(inArray(permissions.id, permissionIds))
      : []
    if (selected.length !== permissionIds.length)
      return 'missing-permission' as const
    if (!validPermissionPolicies(new Map(selected.map(permission => [permission.id, permission.key as PermissionKey])), data.permissionPolicies))
      return 'invalid-policy' as const

    const role = await tx.insert(roles).values({ name: data.name, description: data.description }).returning().then(rows => rows[0])
    const inserted = data.permissionPolicies.length
      ? await tx.insert(rolePolicies).values(data.permissionPolicies.map(policy => ({ roleId: role.id, ...policy }))).returning({ id: rolePolicies.id })
      : []
    await tx.insert(auditEvents).values([
      {
        actorId: actor.id,
        actorEmail: actor.email,
        eventType: 'role.created',
        outcome: 'success',
        resourceType: 'role',
        resourceId: role.id,
        details: { name: role.name }
      },
      ...(inserted.length
        ? [{
            actorId: actor.id,
            actorEmail: actor.email,
            eventType: 'policy.changed',
            outcome: 'success',
            resourceType: 'role',
            resourceId: role.id,
            details: { policyIds: inserted.map(policy => policy.id) }
          }]
        : [])
    ])
    return role.id
  })

  return roleId === 'missing-permission' || roleId === 'invalid-policy'
    ? roleId
    : listRoles().then(items => items.find(role => role.id === roleId)!)
}

export async function updateRole(actorId: string, id: string, data: PatchRole) {
  const result = await db.transaction(async (tx) => {
    const actor = await auditActor(tx, actorId)
    const role = await tx.select().from(roles).where(eq(roles.id, id)).then(rows => rows[0])
    if (!role)
      return 'missing-role' as const
    if (role.name === 'admin' || (role.name === 'user' && data.name && data.name !== 'user'))
      return 'protected-role' as const

    if (data.permissionPolicies) {
      const permissionIds = [...new Set(data.permissionPolicies.map(policy => policy.permissionId))]
      const selected = permissionIds.length
        ? await tx.select({ id: permissions.id, key: permissions.key }).from(permissions).where(inArray(permissions.id, permissionIds))
        : []
      if (selected.length !== permissionIds.length)
        return 'missing-permission' as const
      if (!validPermissionPolicies(new Map(selected.map(permission => [permission.id, permission.key as PermissionKey])), data.permissionPolicies))
        return 'invalid-policy' as const
    }

    const { permissionPolicies, ...changes } = data
    if (Object.keys(changes).length)
      await tx.update(roles).set(changes).where(eq(roles.id, id))

    let policyIds: string[] = []
    if (permissionPolicies) {
      await tx.delete(rolePolicies).where(eq(rolePolicies.roleId, id))
      if (permissionPolicies.length) {
        policyIds = await tx.insert(rolePolicies).values(permissionPolicies.map(policy => ({ roleId: id, ...policy }))).returning({ id: rolePolicies.id }).then(items => items.map(item => item.id))
      }
    }
    await tx.insert(auditEvents).values([
      {
        actorId: actor.id,
        actorEmail: actor.email,
        eventType: 'role.updated',
        outcome: 'success',
        resourceType: 'role',
        resourceId: id,
        details: {}
      },
      ...(permissionPolicies
        ? [{
            actorId: actor.id,
            actorEmail: actor.email,
            eventType: 'policy.changed',
            outcome: 'success',
            resourceType: 'role',
            resourceId: id,
            details: { policyIds }
          }]
        : [])
    ])
    return id
  })

  return typeof result === 'string' && ['missing-role', 'protected-role', 'missing-permission', 'invalid-policy'].includes(result)
    ? result as RoleWriteResult
    : listRoles().then(items => items.find(role => role.id === id)!)
}

export async function deleteRole(actorId: string, id: string): Promise<RoleWriteResult | undefined> {
  return db.transaction(async (tx) => {
    const actor = await auditActor(tx, actorId)
    const role = await tx.select({ name: roles.name }).from(roles).where(eq(roles.id, id)).then(rows => rows[0])
    if (!role)
      return 'missing-role'
    if (role.name === 'admin' || role.name === 'user')
      return 'protected-role'
    const assigned = await tx.select({ userId: userRoles.userId }).from(userRoles).where(eq(userRoles.roleId, id)).limit(1)
    if (assigned.length)
      return 'role-assigned'
    const deletedPolicyIds = await tx.select({ id: rolePolicies.id }).from(rolePolicies).where(eq(rolePolicies.roleId, id))
    await tx.delete(roles).where(eq(roles.id, id))
    await tx.insert(auditEvents).values([
      {
        actorId: actor.id,
        actorEmail: actor.email,
        eventType: 'role.deleted',
        outcome: 'success',
        resourceType: 'role',
        resourceId: id,
        details: { name: role.name }
      },
      ...(deletedPolicyIds.length
        ? [{
            actorId: actor.id,
            actorEmail: actor.email,
            eventType: 'policy.changed',
            outcome: 'success',
            resourceType: 'role',
            resourceId: id,
            details: { deletedPolicyIds: deletedPolicyIds.map(policy => policy.id) }
          }]
        : [])
    ])
  })
}

export async function promoteByEmail(email: string) {
  return db.transaction(async (tx) => {
    const [user, role] = await Promise.all([
      tx.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)).then(rows => rows[0]),
      tx.select({ id: roles.id }).from(roles).where(eq(roles.name, 'admin')).then(rows => rows[0])
    ])
    if (!user || !role)
      return false
    const inserted = await tx.insert(userRoles).values({ userId: user.id, roleId: role.id }).onConflictDoNothing().returning()
    if (inserted.length) {
      await tx.insert(auditEvents).values({
        actorId: user.id,
        actorEmail: user.email,
        eventType: 'admin.promoted',
        outcome: 'success',
        resourceType: 'user',
        resourceId: user.id,
        details: {}
      })
    }
    return true
  })
}
