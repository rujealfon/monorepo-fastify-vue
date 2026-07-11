import type { FastifyReply, FastifyRequest } from 'fastify'

import type { insertTasksSchema, patchTasksSchema } from './tasks.schema.js'
import * as tasksService from './tasks.service.js'

export async function list() {
  return tasksService.listTasks()
}

export async function create(
  request: FastifyRequest<{ Body: insertTasksSchema }>,
  reply: FastifyReply
) {
  const task = await tasksService.createTask(request.body)
  reply.code(201)
  return task
}

export async function getOne(request: FastifyRequest<{ Params: { id: number } }>) {
  return tasksService.getTask(request.params.id)
}

export async function patch(
  request: FastifyRequest<{ Params: { id: number }, Body: patchTasksSchema }>
) {
  return tasksService.updateTask(request.params.id, request.body)
}

export async function remove(
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) {
  await tasksService.deleteTask(request.params.id)
  reply.code(204)
}
