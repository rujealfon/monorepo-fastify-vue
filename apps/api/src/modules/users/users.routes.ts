import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { ChangeRole, LoginUser, PatchProfile, RegisterUser, UserIdParams, UsersPageQuery } from './users.schema.js'

import { z } from 'zod'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'

import * as handlers from './users.handlers.js'
import { adminUserSchema, changeRoleSchema, loginUserSchema, patchProfileSchema, publicUserSchema, registerUserSchema, userIdParamsSchema, usersPageQuerySchema, usersPageSchema } from './users.schema.js'

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
    onRequest: app.authenticate,
    schema: {
      tags: ['Profile'],
      response: { 200: publicUserSchema, 401: httpErrorSchema, 429: httpErrorSchema, 500: httpErrorSchema }
    }
  }, handlers.profile)

  app.patch<{ Body: PatchProfile }>('/', {
    onRequest: app.authenticate,
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

export const adminUsersRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.addHook('onRequest', app.authenticate)

  app.get<{ Querystring: UsersPageQuery }>('/', {
    onRequest: app.requirePermission('users:read'),
    schema: {
      tags: ['Admin'],
      querystring: usersPageQuerySchema,
      response: {
        200: usersPageSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.listUsers)

  app.patch<{ Params: UserIdParams, Body: ChangeRole }>('/:id/role', {
    onRequest: app.requirePermission('users:manage'),
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Admin'],
      params: userIdParamsSchema,
      body: changeRoleSchema,
      response: {
        200: adminUserSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        404: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.changeRole)

  // eslint-disable-next-line drizzle/enforce-delete-with-where -- this is a Fastify route, not a Drizzle query
  app.delete<{ Params: UserIdParams }>('/:id', {
    onRequest: app.requirePermission('users:manage'),
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Admin'],
      params: userIdParamsSchema,
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
  }, handlers.removeUser)
}
