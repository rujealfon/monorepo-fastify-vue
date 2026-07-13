import type { FastifyPluginAsync } from 'fastify'

import { healthRoutes } from '#api/modules/health'
import { adminRolesRoutes, permissionsRoutes } from '#api/modules/roles'
import { tasksRoutes } from '#api/modules/tasks'
import { adminUsersRoutes, authRoutes, profileRoutes } from '#api/modules/users'

export const modules: FastifyPluginAsync = async (app) => {
  await app.register(adminRolesRoutes, { prefix: '/api/v1/admin/roles' })
  await app.register(adminUsersRoutes, { prefix: '/api/v1/admin/users' })
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(healthRoutes, { prefix: '/api/v1/health' })
  await app.register(permissionsRoutes, { prefix: '/api/v1/admin/permissions' })
  await app.register(profileRoutes, { prefix: '/api/v1/profile' })
  await app.register(tasksRoutes, { prefix: '/api/v1/tasks' })
}
