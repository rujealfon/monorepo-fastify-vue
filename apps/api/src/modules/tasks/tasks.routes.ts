import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import * as handlers from './tasks.handlers.js'
import { insertTasksSchema, patchTasksSchema, selectTasksSchema } from './tasks.schema.js'

const paramsSchema = z.object({ id: z.coerce.number().int().positive() })

export const tasksRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get('/', {
    schema: {
      tags: ['Tasks'],
      response: { 200: z.array(selectTasksSchema) }
    }
  }, handlers.list)

  app.post('/', {
    schema: {
      tags: ['Tasks'],
      body: insertTasksSchema,
      response: { 201: selectTasksSchema }
    }
  }, handlers.create)

  app.get('/:id', {
    schema: {
      tags: ['Tasks'],
      params: paramsSchema,
      response: { 200: selectTasksSchema }
    }
  }, handlers.getOne)

  app.patch('/:id', {
    schema: {
      tags: ['Tasks'],
      params: paramsSchema,
      body: patchTasksSchema,
      response: { 200: selectTasksSchema }
    }
  }, handlers.patch)

  // eslint-disable-next-line drizzle/enforce-delete-with-where -- this is a Fastify route, not a Drizzle query
  app.delete('/:id', {
    schema: {
      tags: ['Tasks'],
      params: paramsSchema,
      response: { 204: z.void() }
    }
  }, handlers.remove)
}
