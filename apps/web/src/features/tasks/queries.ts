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
