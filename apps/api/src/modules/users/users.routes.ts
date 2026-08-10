import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { ExchangeHandoff, LoginUser, PatchProfile, RegisterUser } from './users.schema.js'

import { z } from 'zod'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'

import { HANDOFF_EXCHANGE_RATE_LIMIT, HANDOFF_MINT_RATE_LIMIT, LOGIN_RATE_LIMIT, REGISTER_RATE_LIMIT } from './users.constants.js'
import * as handlers from './users.handlers.js'
import { exchangeHandoffSchema, handoffTokenSchema, loginUserSchema, patchProfileSchema, publicUserSchema, registerUserSchema, registrationResponseSchema } from './users.schema.js'

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

  // Lets an authenticated web session mint a short-lived, one-time token that
  // site (a separate origin with no shared cookie domain) can redeem below to
  // establish its own independent session for the same user.
  app.post('/handoff', {
    onRequest: [app.authenticate],
    preHandler: app.sameOrigin,
    config: {
      rateLimit: {
        ...HANDOFF_MINT_RATE_LIMIT,
        keyGenerator: (request: FastifyRequest) => request.user.sub
      }
    },
    schema: {
      tags: ['Authentication'],
      response: {
        200: handoffTokenSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema,
        503: httpErrorSchema
      }
    }
  }, handlers.mintHandoff)

  app.post<{ Body: ExchangeHandoff }>('/handoff/exchange', {
    preHandler: app.sameOrigin,
    config: { rateLimit: HANDOFF_EXCHANGE_RATE_LIMIT },
    schema: {
      tags: ['Authentication'],
      body: exchangeHandoffSchema,
      response: {
        200: publicUserSchema,
        401: httpErrorSchema,
        403: httpErrorSchema,
        422: validationErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema,
        503: httpErrorSchema
      }
    }
  }, handlers.exchangeHandoff)
}

export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get('/', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['Profile'],
      response: { 200: publicUserSchema, 401: httpErrorSchema, 403: httpErrorSchema, 429: httpErrorSchema, 500: httpErrorSchema }
    }
  }, handlers.profile)

  app.patch<{ Body: PatchProfile }>('/', {
    onRequest: [app.authenticate],
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
