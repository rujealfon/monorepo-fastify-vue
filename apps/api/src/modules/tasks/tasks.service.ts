import type { insertTasksSchema, patchTasksSchema } from './tasks.schema.js'
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

export function createTask(userId: string, data: insertTasksSchema) {
  return tasksRepository.insertOne(userId, data)
}

export async function updateTask(userId: string, id: number, data: patchTasksSchema) {
  const task = await tasksRepository.updateById(userId, id, data)
  if (!task) {
    throw new TaskNotFoundError(id)
  }
  return task
}

export async function deleteTask(userId: string, id: number) {
  const task = await tasksRepository.deleteById(userId, id)
  if (!task) {
    throw new TaskNotFoundError(id)
  }
  return task
}
