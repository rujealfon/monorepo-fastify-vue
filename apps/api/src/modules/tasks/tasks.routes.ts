import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { TasksPageQuery } from './tasks.schema.js'

import { z } from 'zod'
import * as handlers from './tasks.handlers.js'
import { insertTasksSchema, patchTasksSchema, selectTasksSchema, tasksPageQuerySchema, tasksPageSchema } from './tasks.schema.js'

const paramsSchema = z.object({ id: z.coerce.number().int().positive() })

export const tasksRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: TasksPageQuery }>('/', {
    onRequest: app.authenticate,
    schema: {
      tags: ['Tasks'],
      querystring: tasksPageQuerySchema,
      response: { 200: tasksPageSchema }
    }
  }, handlers.list)

  app.post<{ Body: insertTasksSchema }>('/', {
    onRequest: app.authenticate,
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Tasks'],
      body: insertTasksSchema,
      response: { 201: selectTasksSchema }
    }
  }, handlers.create)

  app.get<{ Params: { id: number } }>('/:id', {
    onRequest: app.authenticate,
    schema: {
      tags: ['Tasks'],
      params: paramsSchema,
      response: { 200: selectTasksSchema }
    }
  }, handlers.getOne)

  app.patch<{ Params: { id: number }, Body: patchTasksSchema }>('/:id', {
    onRequest: app.authenticate,
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Tasks'],
      params: paramsSchema,
      body: patchTasksSchema,
      response: { 200: selectTasksSchema }
    }
  }, handlers.patch)

  // eslint-disable-next-line drizzle/enforce-delete-with-where -- this is a Fastify route, not a Drizzle query
  app.delete<{ Params: { id: number } }>('/:id', {
    onRequest: app.authenticate,
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Tasks'],
      params: paramsSchema,
      response: { 204: z.void() }
    }
  }, handlers.remove)
}
