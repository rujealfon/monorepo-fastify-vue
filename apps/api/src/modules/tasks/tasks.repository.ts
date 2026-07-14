import type { AuthorizationContext, PolicyDecision, PolicyTask } from '#api/modules/users'
import type { insertTasksSchema, patchTasksSchema } from './tasks.schema.js'

import { asc, count, eq, getTableColumns } from 'drizzle-orm'
import { db } from '#api/db/index.js'
import { compilePolicyPredicate, users } from '#api/modules/users'
import { tasks } from './tasks.schema.js'

const selection = { ...getTableColumns(tasks), ownerEmail: users.email }
const taskFields = {
  'task.id': tasks.id,
  'task.ownerId': tasks.userId,
  'task.ownerEmail': users.email,
  'task.name': tasks.name,
  'task.done': tasks.done
}
export type StoredTask = Awaited<ReturnType<typeof findById>>

export async function findMany(authorization: AuthorizationContext, page: number, limit: number) {
  const where = compilePolicyPredicate(authorization, 'tasks.read', taskFields)
  const [data, [{ total }]] = await Promise.all([
    db.select(selection).from(tasks).innerJoin(users, eq(users.id, tasks.userId)).where(where).orderBy(asc(tasks.id)).limit(limit).offset((page - 1) * limit),
    db.select({ total: count() }).from(tasks).innerJoin(users, eq(users.id, tasks.userId)).where(where)
  ])
  return { data, total }
}

export function findById(id: number) {
  return db.select(selection).from(tasks).innerJoin(users, eq(users.id, tasks.userId)).where(eq(tasks.id, id)).then(rows => rows.at(0))
}

export async function insertOne(userId: string, data: insertTasksSchema) {
  const task = await db.insert(tasks).values({ ...data, userId }).returning({ id: tasks.id }).then(rows => rows[0])
  return findById(task.id).then(inserted => inserted!)
}

export async function updateById(id: number, data: patchTasksSchema, decide: (task: PolicyTask) => PolicyDecision) {
  return db.transaction(async (tx) => {
    const task = await tx.select(selection).from(tasks).innerJoin(users, eq(users.id, tasks.userId)).where(eq(tasks.id, id)).for('update', { of: tasks }).then(rows => rows[0])
    if (!task)
      return { found: false as const }
    const decision = decide(toPolicyTask(task))
    if (!decision.allowed)
      return { found: true as const, decision }
    await tx.update(tasks).set(data).where(eq(tasks.id, id))
    const updated = await tx.select(selection).from(tasks).innerJoin(users, eq(users.id, tasks.userId)).where(eq(tasks.id, id)).then(rows => rows[0])
    return { found: true as const, decision, task: updated }
  })
}

export async function deleteById(id: number, decide: (task: PolicyTask) => PolicyDecision) {
  return db.transaction(async (tx) => {
    const task = await tx.select(selection).from(tasks).innerJoin(users, eq(users.id, tasks.userId)).where(eq(tasks.id, id)).for('update', { of: tasks }).then(rows => rows[0])
    if (!task)
      return { found: false as const }
    const decision = decide(toPolicyTask(task))
    if (!decision.allowed)
      return { found: true as const, decision }
    await tx.delete(tasks).where(eq(tasks.id, id))
    return { found: true as const, decision, task }
  })
}

export function toPolicyTask(task: NonNullable<StoredTask>): PolicyTask {
  return {
    id: task.id,
    ownerId: task.userId,
    ownerEmail: task.ownerEmail,
    name: task.name,
    done: task.done
  }
}
