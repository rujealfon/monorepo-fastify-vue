import type { insertTasksSchema, patchTasksSchema } from './tasks.schema.js'

import { recordAuditEvent } from '#api/modules/audit-logs'

import { TaskNotFoundError } from './tasks.errors.js'
import * as tasksRepository from './tasks.repository.js'

export async function listTasks(userId: string, page: number, limit: number) {
  const { data, total } = await tasksRepository.findMany(userId, page, limit)
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getTask(userId: string, id: number) {
  const task = await tasksRepository.findById(userId, id)
  if (!task) {
    throw new TaskNotFoundError(id)
  }
  return task
}

export async function createTask(userId: string, data: insertTasksSchema) {
  const task = await tasksRepository.insertOne(userId, data)
  await recordAuditEvent({
    actorId: userId,
    action: 'task.created',
    entityType: 'task',
    entityId: task.id,
    metadata: { name: task.name, done: task.done }
  })
  return task
}

export async function updateTask(userId: string, id: number, data: patchTasksSchema) {
  const before = await tasksRepository.findById(userId, id)
  if (!before) {
    throw new TaskNotFoundError(id)
  }
  const task = await tasksRepository.updateById(userId, id, data)
  if (!task) {
    throw new TaskNotFoundError(id)
  }
  const changedKeys = Object.keys(data) as (keyof patchTasksSchema)[]
  await recordAuditEvent({
    actorId: userId,
    action: 'task.updated',
    entityType: 'task',
    entityId: task.id,
    metadata: {
      before: Object.fromEntries(changedKeys.map(key => [key, before[key]])),
      after: Object.fromEntries(changedKeys.map(key => [key, task[key]]))
    }
  })
  return task
}

export async function deleteTask(userId: string, id: number) {
  const task = await tasksRepository.deleteById(userId, id)
  if (!task) {
    throw new TaskNotFoundError(id)
  }
  await recordAuditEvent({
    actorId: userId,
    action: 'task.deleted',
    entityType: 'task',
    entityId: task.id,
    metadata: { name: task.name }
  })
  return task
}
