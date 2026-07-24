import type { AuthorizationContext } from '#api/modules/authorization'
import type { insertTasksSchema, patchTasksSchema } from './tasks.schema.js'

import { recordAuditEvent } from '#api/modules/audit-logs'
import { AUTHORIZATION_CATALOG, InsufficientAbilityError, subject } from '#api/modules/authorization'

import { TaskNotFoundError } from './tasks.errors.js'
import * as tasksRepository from './tasks.repository.js'

function projectTask(caller: AuthorizationContext, task: Record<string, unknown>) {
  const tagged = subject('Task', task)
  return Object.fromEntries(AUTHORIZATION_CATALOG.Task.readableFields
    .filter(field => AUTHORIZATION_CATALOG.Task.identityFields.includes(field) || caller.ability.can('read', tagged, field))
    .map(field => [field, task[field]]))
}

export async function listTasks(caller: AuthorizationContext | string, page: number, limit: number) {
  const { data, total } = await tasksRepository.findMany(typeof caller === 'string' ? caller : caller.ability, page, limit)
  return {
    data: typeof caller === 'string' ? data : data.map(task => projectTask(caller, task)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  }
}

export async function getTask(caller: AuthorizationContext | string, id: number) {
  const task = await tasksRepository.findById(typeof caller === 'string' ? caller : caller.ability, id)
  if (!task) {
    throw new TaskNotFoundError(id)
  }
  return typeof caller === 'string' ? task : projectTask(caller, task)
}

export async function createTask(caller: AuthorizationContext | string, data: insertTasksSchema) {
  if (typeof caller === 'string') {
    const task = await tasksRepository.insertOne(caller, data)
    await recordAuditEvent({ actorId: caller, action: 'task.created', entityType: 'task', entityId: task.id, metadata: { name: task.name, done: task.done } })
    return task
  }
  const proposed = { ...data, done: data.done ?? false, userId: caller.user.id }
  if (!caller.ability.can('create', subject('Task', proposed)))
    throw new InsufficientAbilityError()
  const task = await tasksRepository.insertOne(caller.user.id, data)
  await recordAuditEvent({
    actorId: caller.user.id,
    action: 'task.created',
    entityType: 'task',
    entityId: task.id,
    metadata: { name: task.name, done: task.done }
  })
  return projectTask(caller, task)
}

export async function updateTask(caller: AuthorizationContext | string, id: number, data: patchTasksSchema) {
  const before = await tasksRepository.findById(typeof caller === 'string' ? caller : caller.ability, id, 'update')
  if (!before) {
    throw new TaskNotFoundError(id)
  }
  if (typeof caller !== 'string' && Object.keys(data).some(field => !caller.ability.can('update', subject('Task', before), field)))
    throw new InsufficientAbilityError()
  const task = await tasksRepository.updateById(typeof caller === 'string' ? caller : caller.ability, id, data)
  if (!task) {
    throw new TaskNotFoundError(id)
  }
  const changedKeys = Object.keys(data) as (keyof patchTasksSchema)[]
  await recordAuditEvent({
    actorId: typeof caller === 'string' ? caller : caller.user.id,
    action: 'task.updated',
    entityType: 'task',
    entityId: task.id,
    metadata: {
      before: Object.fromEntries(changedKeys.map(key => [key, before[key]])),
      after: Object.fromEntries(changedKeys.map(key => [key, task[key]]))
    }
  })
  return typeof caller === 'string' ? task : projectTask(caller, task)
}

export async function deleteTask(caller: AuthorizationContext | string, id: number) {
  const task = await tasksRepository.deleteById(typeof caller === 'string' ? caller : caller.ability, id)
  if (!task) {
    throw new TaskNotFoundError(id)
  }
  await recordAuditEvent({
    actorId: typeof caller === 'string' ? caller : caller.user.id,
    action: 'task.deleted',
    entityType: 'task',
    entityId: task.id,
    metadata: { name: task.name }
  })
  return task
}
