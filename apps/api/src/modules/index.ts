import type { FastifyPluginAsync } from 'fastify'

import { healthRoutes } from '#api/modules/health'
import { permissionsRoutes } from '#api/modules/permissions'
import { authorizationRoutes, rolesRoutes, userRolesRoutes } from '#api/modules/roles'
import { tasksRoutes } from '#api/modules/tasks'
import { authRoutes, profileRoutes } from '#api/modules/users'

export const modules: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(authorizationRoutes, { prefix: '/api/v1/me' })
  await app.register(healthRoutes, { prefix: '/api/v1/health' })
  await app.register(permissionsRoutes, { prefix: '/api/v1/permissions' })
  await app.register(profileRoutes, { prefix: '/api/v1/profile' })
  await app.register(rolesRoutes, { prefix: '/api/v1/roles' })
  await app.register(tasksRoutes, { prefix: '/api/v1/tasks' })
  await app.register(userRolesRoutes, { prefix: '/api/v1/users' })
}
