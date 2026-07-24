import type { FastifyReply, FastifyRequest } from 'fastify'

import type { insertTasksSchema, patchTasksSchema, TasksPageQuery } from './tasks.schema.js'
import * as tasksService from './tasks.service.js'

export async function list(request: FastifyRequest<{ Querystring: TasksPageQuery }>) {
  return tasksService.listTasks(request.authorization!, request.query.page, request.query.limit)
}

export async function create(
  request: FastifyRequest<{ Body: insertTasksSchema }>,
  reply: FastifyReply
) {
  const task = await tasksService.createTask(request.authorization!, request.body)
  reply.code(201)
  return task
}

export async function getOne(request: FastifyRequest<{ Params: { id: number } }>) {
  return tasksService.getTask(request.authorization!, request.params.id)
}

export async function patch(
  request: FastifyRequest<{ Params: { id: number }, Body: patchTasksSchema }>
) {
  return tasksService.updateTask(request.authorization!, request.params.id, request.body)
}

export async function remove(
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) {
  await tasksService.deleteTask(request.authorization!, request.params.id)
  reply.code(204)
}
