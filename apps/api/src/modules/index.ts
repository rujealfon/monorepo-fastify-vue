import type { FastifyPluginAsync } from 'fastify'

import { healthRoutes } from '#api/modules/health'
import { tasksRoutes } from '#api/modules/tasks'

export const modules: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes, { prefix: '/api/v1/health' })
  await app.register(tasksRoutes, { prefix: '/api/v1/tasks' })
}
