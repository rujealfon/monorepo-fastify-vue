import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { AuditLogsPageQuery } from './audit-logs.schema.js'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'

import * as handlers from './audit-logs.handlers.js'
import { auditLogsPageQuerySchema, auditLogsPageSchema } from './audit-logs.schema.js'

export const auditLogsRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: AuditLogsPageQuery }>('/', {
    onRequest: [app.authenticate, app.authorize('read', 'AuditLog')],
    schema: {
      tags: ['Audit Logs'],
      querystring: auditLogsPageQuerySchema,
      response: {
        200: auditLogsPageSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.list)
}
