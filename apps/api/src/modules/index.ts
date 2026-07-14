import type { FastifyPluginAsync } from 'fastify'

import { healthRoutes } from '#api/modules/health'
import { tasksRoutes } from '#api/modules/tasks'
import { authRoutes, managementRoutes, profileRoutes } from '#api/modules/users'

export const modules: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(healthRoutes, { prefix: '/api/v1/health' })
  await app.register(managementRoutes, { prefix: '/api/v1/admin' })
  await app.register(profileRoutes, { prefix: '/api/v1/profile' })
  await app.register(tasksRoutes, { prefix: '/api/v1/tasks' })
}
