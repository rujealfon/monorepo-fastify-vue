import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

import { httpErrorSchema } from '#api/lib/http-error.schema.js'

const healthSchema = z.object({ status: z.literal('ok') })

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get('/live', {
    schema: {
      tags: ['Health'],
      response: { 200: healthSchema }
    }
  }, async () => ({ status: 'ok' as const }))

  app.get('/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness probe (checks database connectivity)',
      response: { 200: healthSchema, 429: httpErrorSchema, 503: httpErrorSchema }
    }
  }, async (request, reply) => {
    try {
      await request.server.db.execute(sql`select 1`)
      return { status: 'ok' as const }
    }
    catch (error) {
      request.log.error({ err: error }, 'database readiness check failed')
      return reply.code(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Database unavailable'
      })
    }
  })
}
