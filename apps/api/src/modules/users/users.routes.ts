import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { LoginUser, PatchProfile, RegisterUser } from './users.schema.js'

import { z } from 'zod'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'

import * as handlers from './users.handlers.js'
import { loginUserSchema, patchProfileSchema, profileResponseSchema, publicUserSchema, registerUserSchema } from './users.schema.js'

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
    onRequest: [app.authenticate, app.authorize('read', 'Profile')],
    schema: {
      tags: ['Profile'],
      response: { 200: profileResponseSchema, 401: httpErrorSchema, 403: httpErrorSchema, 429: httpErrorSchema, 500: httpErrorSchema }
    }
  }, handlers.profile)

  app.patch<{ Body: PatchProfile }>('/', {
    onRequest: [app.authenticate, app.authorize('update', 'Profile')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Profile'],
      body: patchProfileSchema,
      response: {
        200: profileResponseSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.patchProfile)
}
