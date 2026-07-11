import type { CreateTask, TaskId, UpdateTask } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { TASK_KEYS } from '@/features/tasks/queries'
import { fail } from '@/features/tasks/tasks.utils'
import { api } from '@/shared/api/client'

export function useTaskMutations(onCreate?: () => void) {
  const queryCache = useQueryCache()
  const refresh = () => queryCache.invalidateQueries({ key: TASK_KEYS.root })

  return {
    create: useMutation({
      mutation: async (body: CreateTask) => fail((await api.POST('/api/v1/tasks/', { body })).response),
      onSuccess: () => {
        onCreate?.()
        return refresh()
      }
    }),
    update: useMutation({
      mutation: async ({ id, ...body }: UpdateTask & { id: TaskId }) => fail((await api.PATCH('/api/v1/tasks/{id}', { params: { path: { id } }, body })).response),
      onSuccess: refresh
    }),
    remove: useMutation({
      mutation: async (id: TaskId) => fail((await api.DELETE('/api/v1/tasks/{id}', { params: { path: { id } } })).response),
      onSuccess: refresh
    })
  }
}
