import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { CreateRole, RoleIdParams, UpdateRole } from './roles.schema.js'

import { z } from 'zod'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'

import * as handlers from './roles.handlers.js'
import { createRoleSchema, permissionCatalogSchema, roleIdParamsSchema, roleSchema, rolesListSchema, updateRoleSchema } from './roles.schema.js'

export const adminRolesRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.addHook('onRequest', app.authenticate)

  app.get('/', {
    onRequest: app.requirePermission('roles:read'),
    schema: {
      tags: ['Admin'],
      response: {
        200: rolesListSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.listRoles)

  app.post<{ Body: CreateRole }>('/', {
    onRequest: app.requirePermission('roles:manage'),
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Admin'],
      body: createRoleSchema,
      response: {
        201: roleSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        409: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.createRole)

  app.patch<{ Params: RoleIdParams, Body: UpdateRole }>('/:id', {
    onRequest: app.requirePermission('roles:manage'),
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Admin'],
      params: roleIdParamsSchema,
      body: updateRoleSchema,
      response: {
        200: roleSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        404: httpErrorSchema,
        409: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.updateRole)

  // eslint-disable-next-line drizzle/enforce-delete-with-where -- this is a Fastify route, not a Drizzle query
  app.delete<{ Params: RoleIdParams }>('/:id', {
    onRequest: app.requirePermission('roles:manage'),
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Admin'],
      params: roleIdParamsSchema,
      response: {
        204: z.void(),
        401: httpErrorSchema,
        403: httpErrorSchema,
        404: httpErrorSchema,
        409: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.removeRole)
}

export const permissionsRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get('/', {
    onRequest: [app.authenticate, app.requirePermission('roles:read')],
    schema: {
      tags: ['Admin'],
      response: {
        200: permissionCatalogSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.permissionCatalog)
}
