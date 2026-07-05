import type { insertTasksSchema, patchTasksSchema } from "./tasks.schema";

import { eventBus, TaskEvents } from "@/api/events";

import { TaskNotFoundError } from "./tasks.errors";
import * as repository from "./tasks.repository";

export async function listTasks() {
  return repository.findMany();
}

export async function getTask(id: number) {
  const task = await repository.findById(id);
  if (!task)
    throw new TaskNotFoundError(id);
  return task;
}

export async function createTask(data: insertTasksSchema) {
  const task = await repository.insertOne(data);
  eventBus.emit(TaskEvents.CREATED, task);
  return task;
}

export async function updateTask(id: number, data: patchTasksSchema) {
  const task = await repository.updateById(id, data);
  if (!task)
    throw new TaskNotFoundError(id);
  eventBus.emit(TaskEvents.UPDATED, task);
  return task;
}

export async function deleteTask(id: number) {
  const deleted = await repository.deleteById(id);
  if (!deleted)
    throw new TaskNotFoundError(id);
  eventBus.emit(TaskEvents.DELETED, { id });
  return deleted;
}
