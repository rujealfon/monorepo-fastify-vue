import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { AuditEventsQuery } from './audit.schema.js'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'

import * as repository from './audit.repository.js'
import { auditEventsPageSchema, auditEventsQuerySchema } from './audit.schema.js'

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  app.get<{ Querystring: AuditEventsQuery }>('/audit-events', {
    onRequest: app.authorize('audit.read'),
    schema: {
      tags: ['Audit'],
      querystring: auditEventsQuerySchema,
      response: {
        200: auditEventsPageSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        422: validationErrorSchema
      }
    }
  }, request => repository.list(request.query))
}
