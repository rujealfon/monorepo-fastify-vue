import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { AdminUsersPageQuery, LoginUser, PatchProfile, PatchUserRole, RegisterUser } from './users.schema.js'

import { z } from 'zod'

import * as handlers from './users.handlers.js'
import {
  adminUserSchema,
  adminUsersPageQuerySchema,
  adminUsersPageSchema,
  loginUserSchema,
  patchProfileSchema,
  patchUserRoleSchema,
  publicUserSchema,
  registerUserSchema
} from './users.schema.js'

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.post<{ Body: RegisterUser }>('/register', {
    preHandler: app.sameOrigin,
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: { tags: ['Authentication'], body: registerUserSchema, response: { 201: publicUserSchema } }
  }, handlers.register)

  app.post<{ Body: LoginUser }>('/login', {
    preHandler: app.sameOrigin,
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { tags: ['Authentication'], body: loginUserSchema, response: { 200: publicUserSchema } }
  }, handlers.login)

  app.post('/logout', {
    preHandler: app.sameOrigin,
    schema: { tags: ['Authentication'], response: { 204: z.void() } }
  }, handlers.logout)
}

export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get('/', {
    onRequest: app.authenticate,
    schema: { tags: ['Profile'], response: { 200: publicUserSchema } }
  }, handlers.profile)

  app.patch<{ Body: PatchProfile }>('/', {
    onRequest: app.authenticate,
    preHandler: app.sameOrigin,
    schema: { tags: ['Profile'], body: patchProfileSchema, response: { 200: publicUserSchema } }
  }, handlers.patchProfile)
}

const adminUserParamsSchema = z.object({ id: z.uuid() })

export const adminUsersRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: AdminUsersPageQuery }>('/', {
    onRequest: app.authenticate,
    preHandler: app.authorize('read', 'User'),
    schema: {
      tags: ['Admin Users'],
      querystring: adminUsersPageQuerySchema,
      response: { 200: adminUsersPageSchema }
    }
  }, handlers.listUsers)

  app.patch<{ Params: { id: string }, Body: PatchUserRole }>('/:id/role', {
    onRequest: app.authenticate,
    preHandler: [app.sameOrigin, app.authorize('update', 'User')],
    schema: {
      tags: ['Admin Users'],
      params: adminUserParamsSchema,
      body: patchUserRoleSchema,
      response: { 200: adminUserSchema }
    }
  }, handlers.patchUserRole)

  // eslint-disable-next-line drizzle/enforce-delete-with-where -- this is a Fastify route, not a Drizzle query
  app.delete<{ Params: { id: string } }>('/:id', {
    onRequest: app.authenticate,
    preHandler: [app.sameOrigin, app.authorize('delete', 'User')],
    schema: {
      tags: ['Admin Users'],
      params: adminUserParamsSchema,
      response: { 204: z.void() }
    }
  }, handlers.removeUser)
}
