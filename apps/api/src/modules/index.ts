import type { FastifyPluginAsync } from 'fastify'

import { healthRoutes } from '#api/modules/health'

export const modules: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes, { prefix: '/api/v1/health' })
}
