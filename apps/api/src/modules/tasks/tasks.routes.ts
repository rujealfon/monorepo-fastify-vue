import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { TasksPageQuery } from './tasks.schema.js'

import { z } from 'zod'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'

import * as handlers from './tasks.handlers.js'
import { insertTasksSchema, patchTasksSchema, selectTasksSchema, tasksPageQuerySchema, tasksPageSchema } from './tasks.schema.js'

const paramsSchema = z.object({ id: z.coerce.number().int().positive() })

export const tasksRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: TasksPageQuery }>('/', {
    onRequest: [app.authenticate, app.authorize('read', 'tasks')],
    schema: {
      tags: ['Tasks'],
      querystring: tasksPageQuerySchema,
      response: {
        200: tasksPageSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.list)

  app.post<{ Body: insertTasksSchema }>('/', {
    onRequest: [app.authenticate, app.authorize('create', 'tasks')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Tasks'],
      body: insertTasksSchema,
      response: {
        201: selectTasksSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.create)

  app.get<{ Params: { id: number } }>('/:id', {
    onRequest: [app.authenticate, app.authorize('read', 'tasks')],
    schema: {
      tags: ['Tasks'],
      params: paramsSchema,
      response: {
        200: selectTasksSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        404: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.getOne)

  app.patch<{ Params: { id: number }, Body: patchTasksSchema }>('/:id', {
    onRequest: [app.authenticate, app.authorize('update', 'tasks')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Tasks'],
      params: paramsSchema,
      body: patchTasksSchema,
      response: {
        200: selectTasksSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        404: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.patch)

  // eslint-disable-next-line drizzle/enforce-delete-with-where -- this is a Fastify route, not a Drizzle query
  app.delete<{ Params: { id: number } }>('/:id', {
    onRequest: [app.authenticate, app.authorize('delete', 'tasks')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Tasks'],
      params: paramsSchema,
      response: {
        204: z.void(),
        401: httpErrorSchema,
        403: httpErrorSchema,
        404: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.remove)
}
