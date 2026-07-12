import type { insertTasksSchema, patchTasksSchema } from './tasks.schema.js'
import { TaskNotFoundError } from './tasks.errors.js'
import * as tasksRepository from './tasks.repository.js'

export async function listTasks(page: number, limit: number) {
  const { data, total } = await tasksRepository.findMany(page, limit)
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getTask(id: number) {
  const task = await tasksRepository.findById(id)
  if (!task) {
    throw new TaskNotFoundError(id)
  }
  return task
}

export function createTask(data: insertTasksSchema) {
  return tasksRepository.insertOne(data)
}

export async function updateTask(id: number, data: patchTasksSchema) {
  const task = await tasksRepository.updateById(id, data)
  if (!task) {
    throw new TaskNotFoundError(id)
  }
  return task
}

export async function deleteTask(id: number) {
  const task = await tasksRepository.deleteById(id)
  if (!task) {
    throw new TaskNotFoundError(id)
  }
  return task
}
