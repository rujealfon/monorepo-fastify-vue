import type { CreateTask, TaskId, UpdateTask } from '@monorepo-fastify-vue/api-client'
import { RpcError } from '@monorepo-fastify-vue/api-client'
import { defineQueryOptions } from '@pinia/colada'

import { api } from '@/shared/api/client'

export const TASK_KEYS = { root: ['tasks'] as const }

async function fail(response: Response) {
  if (!response.ok)
    throw new RpcError(response.status)
}

export const tasksQuery = defineQueryOptions({
  key: TASK_KEYS.root,
  query: async () => {
    const { data, response } = await api.GET('/api/v1/tasks/')
    await fail(response)
    return data ?? []
  }
})

export async function createTask(body: CreateTask) {
  const { response } = await api.POST('/api/v1/tasks/', { body })
  await fail(response)
}

export async function updateTask({ id, ...body }: UpdateTask & { id: TaskId }) {
  const { response } = await api.PATCH('/api/v1/tasks/{id}', {
    params: { path: { id } },
    body
  })
  await fail(response)
}

export async function deleteTask(id: TaskId) {
  const { response } = await api.DELETE('/api/v1/tasks/{id}', {
    params: { path: { id } }
  })
  await fail(response)
}
