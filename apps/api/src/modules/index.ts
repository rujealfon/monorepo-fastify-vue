import type { FastifyPluginAsync } from 'fastify'

import { auditLogsRoutes } from '#api/modules/audit-logs'
import { abilityRulesRoutes, authorizationCatalogRoutes, currentAuthorizationRoutes } from '#api/modules/authorization'
import { healthRoutes } from '#api/modules/health'
import { rolesRoutes, userRolesRoutes } from '#api/modules/roles'
import { tasksRoutes } from '#api/modules/tasks'
import { authRoutes, profileRoutes } from '#api/modules/users'

export const modules: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(currentAuthorizationRoutes, { prefix: '/api/v1/me' })
  await app.register(auditLogsRoutes, { prefix: '/api/v1/audit-logs' })
  await app.register(abilityRulesRoutes, { prefix: '/api/v1/ability-rules' })
  await app.register(authorizationCatalogRoutes, { prefix: '/api/v1/authorization' })
  await app.register(healthRoutes, { prefix: '/api/v1/health' })
  await app.register(profileRoutes, { prefix: '/api/v1/profile' })
  await app.register(rolesRoutes, { prefix: '/api/v1/roles' })
  await app.register(tasksRoutes, { prefix: '/api/v1/tasks' })
  await app.register(userRolesRoutes, { prefix: '/api/v1/users' })
}
