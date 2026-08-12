import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { LoginUser, PatchProfile, RegisterUser } from './users.schema.js'

import { z } from 'zod'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'

import { LOGIN_RATE_LIMIT, REGISTER_RATE_LIMIT } from './users.constants.js'
import * as handlers from './users.handlers.js'
import { loginUserSchema, patchProfileSchema, publicUserSchema, registerUserSchema, registrationResponseSchema } from './users.schema.js'

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.post<{ Body: RegisterUser }>('/register', {
    preHandler: app.sameOrigin,
    config: { rateLimit: REGISTER_RATE_LIMIT },
    schema: {
      tags: ['Authentication'],
      body: registerUserSchema,
      response: {
        202: registrationResponseSchema,
        403: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, handlers.register)

  app.post<{ Body: LoginUser }>('/login', {
    preHandler: app.sameOrigin,
    config: { rateLimit: LOGIN_RATE_LIMIT },
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
    onRequest: [app.session.authenticate],
    schema: {
      tags: ['Profile'],
      response: { 200: publicUserSchema, 401: httpErrorSchema, 403: httpErrorSchema, 429: httpErrorSchema, 500: httpErrorSchema }
    }
  }, handlers.profile)

  app.patch<{ Body: PatchProfile }>('/', {
    onRequest: [app.session.authenticate],
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
