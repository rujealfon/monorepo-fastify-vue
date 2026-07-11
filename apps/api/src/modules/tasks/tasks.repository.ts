import type { insertTasksSchema, patchTasksSchema } from './tasks.schema.js'

import { eq } from 'drizzle-orm'
import { db } from '#api/db/index.js'
import { tasks } from './tasks.schema.js'

export function findMany() {
  return db.select().from(tasks)
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
