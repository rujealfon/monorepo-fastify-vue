import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { CreateRole, PatchRole, ReplaceRolePermissions, ReplaceUserRoles, UsersPageQuery } from './roles.schema.js'

import { z } from 'zod'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'

import * as handlers from './roles.handlers.js'
import {
  authorizationSchema,
  createRoleSchema,
  patchRoleSchema,
  replaceRolePermissionsSchema,
  replaceUserRolesSchema,
  roleWithPermissionsSchema,
  roleWithUserCountSchema,
  selectRoleSchema,
  usersPageQuerySchema,
  usersPageSchema
} from './roles.schema.js'

const roleParamsSchema = z.object({ roleId: z.coerce.number().int().positive() })
const userParamsSchema = z.object({ userId: z.uuid() })

const readErrors = {
  401: httpErrorSchema,
  403: httpErrorSchema,
  422: validationErrorSchema,
  429: httpErrorSchema,
  500: httpErrorSchema
}

const writeErrors = { ...readErrors, 400: httpErrorSchema, 404: httpErrorSchema }

export const rolesRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get('/', {
    onRequest: [app.authenticate, app.authorize('read', 'roles')],
    schema: {
      tags: ['Roles'],
      response: { 200: z.array(roleWithUserCountSchema), ...readErrors }
    }
  }, handlers.listRoles)

  app.post<{ Body: CreateRole }>('/', {
    onRequest: [app.authenticate, app.authorize('create', 'roles')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Roles'],
      body: createRoleSchema,
      response: { 201: roleWithPermissionsSchema, 409: httpErrorSchema, ...writeErrors }
    }
  }, handlers.createRole)

  app.get<{ Params: { roleId: number } }>('/:roleId', {
    onRequest: [app.authenticate, app.authorize('read', 'roles')],
    schema: {
      tags: ['Roles'],
      params: roleParamsSchema,
      response: { 200: roleWithPermissionsSchema, 404: httpErrorSchema, ...readErrors }
    }
  }, handlers.getRole)

  app.patch<{ Params: { roleId: number }, Body: PatchRole }>('/:roleId', {
    onRequest: [app.authenticate, app.authorize('update', 'roles')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Roles'],
      params: roleParamsSchema,
      body: patchRoleSchema,
      response: { 200: roleWithPermissionsSchema, ...writeErrors }
    }
  }, handlers.patchRole)

  // eslint-disable-next-line drizzle/enforce-delete-with-where -- this is a Fastify route, not a Drizzle query
  app.delete<{ Params: { roleId: number } }>('/:roleId', {
    onRequest: [app.authenticate, app.authorize('delete', 'roles')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Roles'],
      params: roleParamsSchema,
      response: { 204: z.void(), ...writeErrors }
    }
  }, handlers.deleteRole)

  app.put<{ Params: { roleId: number }, Body: ReplaceRolePermissions }>('/:roleId/permissions', {
    onRequest: [app.authenticate, app.authorize('assign_permissions', 'roles')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Roles'],
      params: roleParamsSchema,
      body: replaceRolePermissionsSchema,
      response: { 200: roleWithPermissionsSchema, ...writeErrors }
    }
  }, handlers.putRolePermissions)
}

export const userRolesRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: UsersPageQuery }>('/', {
    onRequest: [app.authenticate, app.authorize('read', 'users')],
    schema: {
      tags: ['Roles'],
      querystring: usersPageQuerySchema,
      response: { 200: usersPageSchema, ...readErrors }
    }
  }, handlers.listUsers)

  app.get<{ Params: { userId: string } }>('/:userId/roles', {
    onRequest: [app.authenticate, app.authorize('read', 'users')],
    schema: {
      tags: ['Roles'],
      params: userParamsSchema,
      response: { 200: z.array(selectRoleSchema), 404: httpErrorSchema, ...readErrors }
    }
  }, handlers.getUserRoles)

  app.put<{ Params: { userId: string }, Body: ReplaceUserRoles }>('/:userId/roles', {
    onRequest: [app.authenticate, app.authorize('assign_roles', 'users')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Roles'],
      params: userParamsSchema,
      body: replaceUserRolesSchema,
      response: { 200: z.array(selectRoleSchema), 409: httpErrorSchema, ...writeErrors }
    }
  }, handlers.putUserRoles)
}

export const authorizationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get('/authorization', {
    onRequest: [app.authenticate, request => app.loadAuthorization(request).then(() => undefined)],
    schema: {
      tags: ['Authorization'],
      response: { 200: authorizationSchema, 401: httpErrorSchema, 429: httpErrorSchema, 500: httpErrorSchema }
    }
  }, handlers.getMyAuthorization)
}
