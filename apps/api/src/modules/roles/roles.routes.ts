import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { CreateRole, UpdateRole } from './roles.schema.js'

import { z } from 'zod'

import * as handlers from './roles.handlers.js'
import { createRoleSchema, roleWithPermissionsSchema, updateRoleSchema } from './roles.schema.js'

const paramsSchema = z.object({ id: z.uuid() })

export const adminRolesRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get('/', {
    onRequest: app.authenticate,
    preHandler: app.authorize('read', 'Role'),
    schema: {
      tags: ['Roles'],
      response: { 200: z.array(roleWithPermissionsSchema) }
    }
  }, handlers.list)

  app.post<{ Body: CreateRole }>('/', {
    onRequest: app.authenticate,
    preHandler: [app.sameOrigin, app.authorize('create', 'Role')],
    schema: {
      tags: ['Roles'],
      body: createRoleSchema,
      response: { 201: roleWithPermissionsSchema }
    }
  }, handlers.create)

  app.patch<{ Params: { id: string }, Body: UpdateRole }>('/:id', {
    onRequest: app.authenticate,
    preHandler: [app.sameOrigin, app.authorize('update', 'Role')],
    schema: {
      tags: ['Roles'],
      params: paramsSchema,
      body: updateRoleSchema,
      response: { 200: roleWithPermissionsSchema }
    }
  }, handlers.patch)

  // eslint-disable-next-line drizzle/enforce-delete-with-where -- this is a Fastify route, not a Drizzle query
  app.delete<{ Params: { id: string } }>('/:id', {
    onRequest: app.authenticate,
    preHandler: [app.sameOrigin, app.authorize('delete', 'Role')],
    schema: {
      tags: ['Roles'],
      params: paramsSchema,
      response: { 204: z.void() }
    }
  }, handlers.remove)
}
