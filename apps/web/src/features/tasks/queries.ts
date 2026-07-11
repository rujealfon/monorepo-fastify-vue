import { defineQueryOptions } from '@pinia/colada'

import { fail } from '@/features/tasks/tasks.utils'
import { api } from '@/shared/api/client'

export const TASK_KEYS = { root: ['tasks'] as const }

export const tasksQuery = defineQueryOptions({
  key: TASK_KEYS.root,
  query: async () => {
    const { data, response } = await api.GET('/api/v1/tasks/')
    await fail(response)
    return data ?? []
  }
})
