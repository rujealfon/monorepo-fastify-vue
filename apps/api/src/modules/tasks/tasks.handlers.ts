import type { FastifyReply, FastifyRequest } from 'fastify'

import type { insertTasksSchema, patchTasksSchema, TasksPageQuery } from './tasks.schema.js'
import { ForbiddenError } from '#api/modules/users'

import { TaskNotFoundError } from './tasks.errors.js'
import * as tasksService from './tasks.service.js'

export async function list(request: FastifyRequest<{ Querystring: TasksPageQuery }>) {
  const result = await tasksService.listTasks(request.authorization, request.query.page, request.query.limit)
  await request.server.auditDecision(request, 'tasks.read', result.decision, 'task', undefined, {
    consideredPolicyIds: request.authorization.policies.filter(policy => policy.permission === 'tasks.read').map(policy => policy.id),
    returnedCount: result.denied ? 0 : result.data.length
  })
  if (result.denied)
    throw new ForbiddenError()
  const { decision: _, denied: __, ...page } = result
  return page
}

export async function create(
  request: FastifyRequest<{ Body: insertTasksSchema }>,
  reply: FastifyReply
) {
  const result = await tasksService.createTask(request.authorization, request.body)
  await request.server.auditDecision(request, 'tasks.create', result.decision, 'task', result.task ? String(result.task.id) : undefined)
  if (!result.task)
    throw new ForbiddenError()
  reply.code(201)
  return result.task
}

export async function getOne(request: FastifyRequest<{ Params: { id: number } }>) {
  try {
    const result = await tasksService.getTask(request.authorization, request.params.id)
    await request.server.auditDecision(request, 'tasks.read', result.decision, 'task', String(request.params.id))
    return result.task
  }
  catch (error) {
    await auditDeniedTask(request, 'tasks.read', error)
    throw error
  }
}

export async function patch(
  request: FastifyRequest<{ Params: { id: number }, Body: patchTasksSchema }>
) {
  try {
    const result = await tasksService.updateTask(request.authorization, request.params.id, request.body)
    await request.server.auditDecision(request, 'tasks.update', result.decision, 'task', String(request.params.id))
    return result.task
  }
  catch (error) {
    await auditDeniedTask(request, 'tasks.update', error)
    throw error
  }
}

export async function remove(
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) {
  try {
    const result = await tasksService.deleteTask(request.authorization, request.params.id)
    await request.server.auditDecision(request, 'tasks.delete', result.decision, 'task', String(request.params.id))
    reply.code(204)
  }
  catch (error) {
    await auditDeniedTask(request, 'tasks.delete', error)
    throw error
  }
}

async function auditDeniedTask(request: FastifyRequest, permission: 'tasks.delete' | 'tasks.read' | 'tasks.update', error: unknown) {
  if (error instanceof TaskNotFoundError && error.decision)
    await request.server.auditDecision(request, permission, error.decision, 'task', String(error.id))
}
