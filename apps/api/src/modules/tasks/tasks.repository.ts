import type { AppAbility } from '#api/modules/authorization'
import type { insertTasksSchema, patchTasksSchema } from './tasks.schema.js'

import { and, asc, count, eq } from 'drizzle-orm'
import { db } from '#api/db/index.js'
import { rulesToDrizzleWhere } from '#api/modules/authorization'
import { tasks } from './tasks.schema.js'

export async function findMany(ability: AppAbility | string, page: number, limit: number) {
  const where = typeof ability === 'string' ? eq(tasks.userId, ability) : rulesToDrizzleWhere(ability, 'read', 'Task')
  const [data, [{ total }]] = await Promise.all([
    db.select().from(tasks).where(where).orderBy(asc(tasks.id)).limit(limit).offset((page - 1) * limit),
    db.select({ total: count() }).from(tasks).where(where)
  ])
  return { data, total }
}

export function findById(ability: AppAbility | string, id: number, action: 'read' | 'update' | 'delete' = 'read') {
  return db.select().from(tasks).where(and(eq(tasks.id, id), typeof ability === 'string' ? eq(tasks.userId, ability) : rulesToDrizzleWhere(ability, action, 'Task'))).then(rows => rows.at(0))
}

export function insertOne(userId: string, data: insertTasksSchema) {
  return db.insert(tasks).values({ ...data, userId }).returning().then(rows => rows[0])
}

export function updateById(ability: AppAbility | string, id: number, data: patchTasksSchema) {
  return db.update(tasks).set(data).where(and(eq(tasks.id, id), typeof ability === 'string' ? eq(tasks.userId, ability) : rulesToDrizzleWhere(ability, 'update', 'Task'))).returning().then(rows => rows.at(0))
}

export function deleteById(ability: AppAbility | string, id: number) {
  return db.delete(tasks)
    .where(and(eq(tasks.id, id), typeof ability === 'string' ? eq(tasks.userId, ability) : rulesToDrizzleWhere(ability, 'delete', 'Task')))
    .returning()
    .then(rows => rows.at(0))
}
