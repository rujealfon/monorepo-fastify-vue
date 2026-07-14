import type { AuthorizationContext, PermissionKey, PolicyDecision, PolicyTask } from '#api/modules/users'
import type { insertTasksSchema, patchTasksSchema } from './tasks.schema.js'

import { evaluatePolicyDecision, hasPotentialAllow } from '#api/modules/users'

import { TaskNotFoundError } from './tasks.errors.js'
import * as tasksRepository from './tasks.repository.js'

function actions(authorization: AuthorizationContext, task: PolicyTask) {
  return {
    update: evaluatePolicyDecision(authorization, 'tasks.update', task).allowed,
    delete: evaluatePolicyDecision(authorization, 'tasks.delete', task).allowed
  }
}

function withActions(authorization: AuthorizationContext, task: NonNullable<tasksRepository.StoredTask>) {
  return { ...task, actions: actions(authorization, tasksRepository.toPolicyTask(task)) }
}

export async function listTasks(authorization: AuthorizationContext, page: number, limit: number) {
  if (!hasPotentialAllow(authorization, 'tasks.read'))
    return { denied: true as const, decision: potentialDecision(authorization, 'tasks.read') }
  const { data, total } = await tasksRepository.findMany(authorization, page, limit)
  return {
    denied: false as const,
    data: data.map(task => withActions(authorization, task)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    decision: potentialDecision(authorization, 'tasks.read')
  }
}

export async function getTask(authorization: AuthorizationContext, id: number) {
  const task = await tasksRepository.findById(id)
  if (!task)
    throw new TaskNotFoundError(id)
  const decision = evaluatePolicyDecision(authorization, 'tasks.read', tasksRepository.toPolicyTask(task))
  if (!decision.allowed)
    throw new TaskNotFoundError(id, decision)
  return { task: withActions(authorization, task), decision }
}

export async function createTask(authorization: AuthorizationContext, data: insertTasksSchema) {
  const proposed: PolicyTask = {
    ownerId: authorization.actor.id,
    ownerEmail: authorization.actor.email,
    name: data.name,
    done: data.done ?? false
  }
  const decision = evaluatePolicyDecision(authorization, 'tasks.create', proposed)
  return decision.allowed
    ? { task: withActions(authorization, await tasksRepository.insertOne(authorization.actor.id, data)), decision }
    : { decision }
}

export async function updateTask(authorization: AuthorizationContext, id: number, data: patchTasksSchema) {
  const result = await tasksRepository.updateById(id, data, task => evaluatePolicyDecision(authorization, 'tasks.update', task))
  if (!result.found)
    throw new TaskNotFoundError(id)
  if (!result.decision.allowed || !result.task)
    throw new TaskNotFoundError(id, result.decision)
  return { task: withActions(authorization, result.task), decision: result.decision }
}

export async function deleteTask(authorization: AuthorizationContext, id: number) {
  const result = await tasksRepository.deleteById(id, task => evaluatePolicyDecision(authorization, 'tasks.delete', task))
  if (!result.found)
    throw new TaskNotFoundError(id)
  if (!result.decision.allowed)
    throw new TaskNotFoundError(id, result.decision)
  return { task: result.task!, decision: result.decision }
}

function potentialDecision(authorization: AuthorizationContext, permission: PermissionKey): PolicyDecision {
  return {
    allowed: hasPotentialAllow(authorization, permission),
    matchedAllowPolicyIds: [],
    matchedDenyPolicyIds: []
  }
}
