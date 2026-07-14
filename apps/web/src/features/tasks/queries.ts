import { defineQueryOptions } from '@pinia/colada'

import { api, fail } from '@/shared/api/client'

export const TASK_KEYS = {
  root: ['tasks'] as const,
  page: (page: number) => [...TASK_KEYS.root, { page }] as const
}

export const tasksQuery = defineQueryOptions((page: number) => ({
  key: TASK_KEYS.page(page),
  query: async () => {
    const { data, response } = await api.GET('/api/v1/tasks/', { params: { query: { page, limit: 20 } } })
    await fail(response)
    return data
  },
  placeholderData: previous => previous
}))
