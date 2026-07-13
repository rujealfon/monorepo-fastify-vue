import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { CreateRole, RoleIdParams, UpdateRole } from './roles.schema.js'

import { z } from 'zod'

import * as handlers from './roles.handlers.js'
import { createRoleSchema, permissionCatalogSchema, roleIdParamsSchema, roleSchema, rolesListSchema, updateRoleSchema } from './roles.schema.js'

export const adminRolesRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.addHook('onRequest', app.authenticate)

  app.get('/', {
    onRequest: app.requirePermission('roles:read'),
    schema: { tags: ['Admin'], response: { 200: rolesListSchema } }
  }, handlers.listRoles)

  app.post<{ Body: CreateRole }>('/', {
    onRequest: app.requirePermission('roles:manage'),
    preHandler: app.sameOrigin,
    schema: { tags: ['Admin'], body: createRoleSchema, response: { 201: roleSchema } }
  }, handlers.createRole)

  app.patch<{ Params: RoleIdParams, Body: UpdateRole }>('/:id', {
    onRequest: app.requirePermission('roles:manage'),
    preHandler: app.sameOrigin,
    schema: { tags: ['Admin'], params: roleIdParamsSchema, body: updateRoleSchema, response: { 200: roleSchema } }
  }, handlers.updateRole)

  // eslint-disable-next-line drizzle/enforce-delete-with-where -- this is a Fastify route, not a Drizzle query
  app.delete<{ Params: RoleIdParams }>('/:id', {
    onRequest: app.requirePermission('roles:manage'),
    preHandler: app.sameOrigin,
    schema: { tags: ['Admin'], params: roleIdParamsSchema, response: { 204: z.void() } }
  }, handlers.removeRole)
}

export const permissionsRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get('/', {
    onRequest: [app.authenticate, app.requirePermission('roles:read')],
    schema: { tags: ['Admin'], response: { 200: permissionCatalogSchema } }
  }, handlers.permissionCatalog)
}
