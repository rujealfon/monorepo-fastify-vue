import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { CreateRole, LoginUser, PatchProfile, PatchRole, RegisterUser, ReplaceUserRoles, UsersPageQuery } from './users.schema.js'

import { z } from 'zod'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'

import * as handlers from './users.handlers.js'
import {
  createRoleSchema,
  loginUserSchema,
  managedUserSchema,
  patchProfileSchema,
  patchRoleSchema,
  permissionSchema,
  publicUserSchema,
  registerUserSchema,
  replaceUserRolesSchema,
  roleSchema,
  usersPageQuerySchema,
  usersPageSchema
} from './users.schema.js'

const uuidParamsSchema = z.object({ id: z.uuid() })

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.post<{ Body: RegisterUser }>('/register', {
    preHandler: app.sameOrigin,
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Authentication'],
      body: registerUserSchema,
      response: {
        201: publicUserSchema,
        403: httpErrorSchema,
        409: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.register)

  app.post<{ Body: LoginUser }>('/login', {
    preHandler: app.sameOrigin,
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Authentication'],
      body: loginUserSchema,
      response: {
        200: publicUserSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.login)

  app.post('/logout', {
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Authentication'],
      response: { 204: z.void(), 403: httpErrorSchema, 429: httpErrorSchema, 500: httpErrorSchema }
    }
  }, handlers.logout)
}

export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get('/', {
    onRequest: app.authorize('profile.read'),
    schema: {
      tags: ['Profile'],
      response: { 200: publicUserSchema, 401: httpErrorSchema, 429: httpErrorSchema, 500: httpErrorSchema }
    }
  }, handlers.profile)

  app.patch<{ Body: PatchProfile }>('/', {
    onRequest: app.authorize('profile.update'),
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Profile'],
      body: patchProfileSchema,
      response: {
        200: publicUserSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.patchProfile)
}

export const managementRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: UsersPageQuery }>('/users', {
    onRequest: app.authorize('users.read'),
    schema: {
      tags: ['Access control'],
      querystring: usersPageQuerySchema,
      response: { 200: usersPageSchema, 401: httpErrorSchema, 403: httpErrorSchema, 422: validationErrorSchema }
    }
  }, handlers.listUsers)

  app.put<{ Params: { id: string }, Body: ReplaceUserRoles }>('/users/:id/roles', {
    onRequest: app.authorize('users.roles.update'),
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Access control'],
      params: uuidParamsSchema,
      body: replaceUserRolesSchema,
      response: {
        200: managedUserSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        404: httpErrorSchema,
        409: httpErrorSchema,
        422: validationErrorSchema
      }
    }
  }, handlers.replaceUserRoles)

  app.get('/roles', {
    onRequest: app.authorize('roles.read'),
    schema: {
      tags: ['Access control'],
      response: { 200: z.array(roleSchema), 401: httpErrorSchema, 403: httpErrorSchema }
    }
  }, handlers.listRoles)

  app.post<{ Body: CreateRole }>('/roles', {
    onRequest: app.authorize('roles.create'),
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Access control'],
      body: createRoleSchema,
      response: {
        201: roleSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        404: httpErrorSchema,
        409: httpErrorSchema,
        422: validationErrorSchema
      }
    }
  }, handlers.createRole)

  app.patch<{ Params: { id: string }, Body: PatchRole }>('/roles/:id', {
    onRequest: app.authorize('roles.update'),
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Access control'],
      params: uuidParamsSchema,
      body: patchRoleSchema,
      response: {
        200: roleSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        404: httpErrorSchema,
        409: httpErrorSchema,
        422: validationErrorSchema
      }
    }
  }, handlers.patchRole)

  // eslint-disable-next-line drizzle/enforce-delete-with-where -- this is a Fastify route, not a Drizzle query
  app.delete<{ Params: { id: string } }>('/roles/:id', {
    onRequest: app.authorize('roles.delete'),
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Access control'],
      params: uuidParamsSchema,
      response: {
        204: z.void(),
        401: httpErrorSchema,
        403: httpErrorSchema,
        404: httpErrorSchema,
        409: httpErrorSchema,
        422: validationErrorSchema
      }
    }
  }, handlers.deleteRole)

  app.get('/permissions', {
    onRequest: app.authorize('permissions.read'),
    schema: {
      tags: ['Access control'],
      response: { 200: z.array(permissionSchema), 401: httpErrorSchema, 403: httpErrorSchema }
    }
  }, handlers.listPermissions)
}
