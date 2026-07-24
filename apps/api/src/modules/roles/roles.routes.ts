import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { ReplaceRoleAbilityRules } from '#api/modules/authorization'
import type { CreateRole, PatchRole, ReplaceUserRoles, UsersPageQuery } from './roles.schema.js'

import { z } from 'zod'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'
import { replaceRoleAbilityRulesSchema, selectAbilityRuleSchema } from '#api/modules/authorization'

import * as handlers from './roles.handlers.js'
import {
  createRoleSchema,
  patchRoleSchema,
  replaceUserRolesSchema,
  roleWithAbilityRulesSchema,
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
    onRequest: [app.authenticate, app.authorize('read', 'Role')],
    schema: {
      tags: ['Roles'],
      response: { 200: z.array(roleWithUserCountSchema), ...readErrors }
    }
  }, handlers.listRoles)

  app.post<{ Body: CreateRole }>('/', {
    onRequest: [app.authenticate, app.authorize('create', 'Role')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Roles'],
      body: createRoleSchema,
      response: { 201: roleWithAbilityRulesSchema, 409: httpErrorSchema, ...writeErrors }
    }
  }, handlers.createRole)

  app.get<{ Params: { roleId: number } }>('/:roleId', {
    onRequest: [app.authenticate, app.authorize('read', 'Role')],
    schema: {
      tags: ['Roles'],
      params: roleParamsSchema,
      response: { 200: roleWithAbilityRulesSchema, 404: httpErrorSchema, ...readErrors }
    }
  }, handlers.getRole)

  app.patch<{ Params: { roleId: number }, Body: PatchRole }>('/:roleId', {
    onRequest: [app.authenticate, app.authorize('update', 'Role')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Roles'],
      params: roleParamsSchema,
      body: patchRoleSchema,
      response: { 200: roleWithAbilityRulesSchema, ...writeErrors }
    }
  }, handlers.patchRole)

  // eslint-disable-next-line drizzle/enforce-delete-with-where -- this is a Fastify route, not a Drizzle query
  app.delete<{ Params: { roleId: number } }>('/:roleId', {
    onRequest: [app.authenticate, app.authorize('delete', 'Role')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Roles'],
      params: roleParamsSchema,
      response: { 204: z.void(), ...writeErrors }
    }
  }, handlers.deleteRole)

  app.put<{ Params: { roleId: number }, Body: ReplaceRoleAbilityRules }>('/:roleId/ability-rules', {
    onRequest: [app.authenticate, app.authorize('manage', 'all')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Roles'],
      params: roleParamsSchema,
      body: replaceRoleAbilityRulesSchema,
      response: { 200: z.array(selectAbilityRuleSchema), ...writeErrors }
    }
  }, handlers.putRoleAbilityRules)
}

export const userRolesRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: UsersPageQuery }>('/', {
    onRequest: [app.authenticate, app.authorize('read', 'User')],
    schema: {
      tags: ['Roles'],
      querystring: usersPageQuerySchema,
      response: { 200: usersPageSchema, ...readErrors }
    }
  }, handlers.listUsers)

  app.get<{ Params: { userId: string } }>('/:userId/roles', {
    onRequest: [app.authenticate, app.authorize('read', 'User')],
    schema: {
      tags: ['Roles'],
      params: userParamsSchema,
      response: { 200: z.array(selectRoleSchema), 404: httpErrorSchema, ...readErrors }
    }
  }, handlers.getUserRoles)

  app.put<{ Params: { userId: string }, Body: ReplaceUserRoles }>('/:userId/roles', {
    onRequest: [app.authenticate, app.authorize('update', 'User')],
    preHandler: app.sameOrigin,
    schema: {
      tags: ['Roles'],
      params: userParamsSchema,
      body: replaceUserRolesSchema,
      response: { 200: z.array(selectRoleSchema), 409: httpErrorSchema, ...writeErrors }
    }
  }, handlers.putUserRoles)
}
