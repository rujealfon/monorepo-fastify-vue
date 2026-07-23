import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { z } from 'zod'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'

import * as handlers from './permissions.handlers.js'
import { selectPermissionSchema } from './permissions.schema.js'

export const permissionsRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get('/', {
    onRequest: [app.authenticate, app.authorize('read', 'permissions')],
    schema: {
      tags: ['Permissions'],
      response: {
        200: z.array(selectPermissionSchema),
        401: httpErrorSchema,
        403: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.listPermissions)
}
