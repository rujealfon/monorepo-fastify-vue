import type { insertTasksSchema, patchTasksSchema } from './tasks.schema.js'

import { asc, count, eq } from 'drizzle-orm'
import { db } from '#api/db/index.js'
import { tasks } from './tasks.schema.js'

export async function findMany(page: number, limit: number) {
  const [data, [{ total }]] = await Promise.all([
    db.select().from(tasks).orderBy(asc(tasks.id)).limit(limit).offset((page - 1) * limit),
    db.select({ total: count() }).from(tasks)
  ])
  return { data, total }
}

export function findById(id: number) {
  return db.select().from(tasks).where(eq(tasks.id, id)).then(rows => rows.at(0))
}

export function insertOne(data: insertTasksSchema) {
  return db.insert(tasks).values(data).returning().then(rows => rows[0])
}

export function updateById(id: number, data: patchTasksSchema) {
  return db.update(tasks).set(data).where(eq(tasks.id, id)).returning().then(rows => rows.at(0))
}

export function deleteById(id: number) {
  return db.delete(tasks).where(eq(tasks.id, id)).returning().then(rows => rows.at(0))
}
