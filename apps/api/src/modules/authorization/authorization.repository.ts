import type { DbExecutor } from '#api/modules/audit-logs'
import type { CreateAbilityRule, PatchAbilityRule } from './authorization.schema.js'

import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import { db } from '#api/db/index.js'
import { roles, userRoles } from '#api/modules/roles/roles.schema.js'
import { users } from '#api/modules/users/users.schema.js'

import { abilityRules, roleAbilityRules } from './authorization.schema.js'

type AuditCallback = (tx: DbExecutor) => Promise<void>

export function findAuthorizationRows(userId: string) {
  return db.select({
    userId: users.id,
    email: users.email,
    authorizationVersion: users.authorizationVersion,
    roleId: roles.id,
    roleName: roles.name,
    roleSlug: roles.slug,
    rule: abilityRules
  })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, and(eq(roles.id, userRoles.roleId), eq(roles.isActive, true)))
    .leftJoin(roleAbilityRules, eq(roleAbilityRules.roleId, roles.id))
    .leftJoin(abilityRules, eq(abilityRules.id, roleAbilityRules.abilityRuleId))
    .where(eq(users.id, userId))
}

export function findRules() {
  return db.select().from(abilityRules).orderBy(asc(abilityRules.priority), asc(abilityRules.id))
}

export function findRulesByIds(ids: number[]) {
  return ids.length ? db.select().from(abilityRules).where(inArray(abilityRules.id, ids)) : Promise.resolve([])
}

export function findRuleById(id: number) {
  return db.select().from(abilityRules).where(eq(abilityRules.id, id)).then(rows => rows.at(0))
}

export function findRoleRules(roleId: number) {
  return db.select({ rule: abilityRules }).from(roleAbilityRules).innerJoin(abilityRules, eq(abilityRules.id, roleAbilityRules.abilityRuleId)).where(eq(roleAbilityRules.roleId, roleId)).orderBy(asc(abilityRules.priority), asc(abilityRules.id)).then(rows => rows.map(row => row.rule))
}

function bumpForRule(tx: DbExecutor, ruleId: number) {
  return tx.update(users)
    .set({ authorizationVersion: sql`${users.authorizationVersion} + 1` })
    .where(inArray(users.id, db.select({ id: userRoles.userId }).from(userRoles)
      .innerJoin(roleAbilityRules, eq(roleAbilityRules.roleId, userRoles.roleId))
      .where(eq(roleAbilityRules.abilityRuleId, ruleId))))
}

export function insertRule(data: CreateAbilityRule, audit: AuditCallback) {
  return db.transaction(async (tx) => {
    const rule = await tx.insert(abilityRules).values({ ...data, isSystem: false, conditionSchemaVersion: 1 }).returning().then(rows => rows[0])
    await audit(tx)
    return rule
  })
}

export function updateRule(id: number, data: PatchAbilityRule, audit: AuditCallback) {
  return db.transaction(async (tx) => {
    const rule = await tx.update(abilityRules).set(data).where(eq(abilityRules.id, id)).returning().then(rows => rows.at(0))
    if (rule) {
      await bumpForRule(tx, id)
      await audit(tx)
    }
    return rule
  })
}

export function deleteRule(id: number, audit: AuditCallback) {
  return db.transaction(async (tx) => {
    await bumpForRule(tx, id)
    const rule = await tx.delete(abilityRules).where(eq(abilityRules.id, id)).returning().then(rows => rows.at(0))
    if (rule)
      await audit(tx)
    return rule
  })
}

export function replaceRoleRules(roleId: number, ruleIds: number[], actorId: string, audit: AuditCallback) {
  return db.transaction(async (tx) => {
    await tx.delete(roleAbilityRules).where(eq(roleAbilityRules.roleId, roleId))
    if (ruleIds.length)
      await tx.insert(roleAbilityRules).values(ruleIds.map(abilityRuleId => ({ roleId, abilityRuleId, assignedBy: actorId })))
    await tx.update(users)
      .set({ authorizationVersion: sql`${users.authorizationVersion} + 1` })
      .where(inArray(users.id, db.select({ id: userRoles.userId }).from(userRoles).where(eq(userRoles.roleId, roleId))))
    await audit(tx)
  })
}
