import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { CreateAbilityRule, PatchAbilityRule } from './authorization.schema.js'

import { z } from 'zod'

import { httpErrorSchema, validationErrorSchema } from '#api/lib/http-error.schema.js'

import {
  authorizationCatalogSchema,
  createAbilityRuleSchema,
  currentAuthorizationSchema,
  patchAbilityRuleSchema,
  selectAbilityRuleSchema
} from './authorization.schema.js'
import * as service from './authorization.service.js'

const params = z.object({ ruleId: z.coerce.number().int().positive() })
const errors = {
  400: httpErrorSchema,
  401: httpErrorSchema,
  403: httpErrorSchema,
  404: httpErrorSchema,
  409: httpErrorSchema,
  422: validationErrorSchema,
  429: httpErrorSchema,
  500: httpErrorSchema
}

export const abilityRulesRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  app.get('/', {
    onRequest: [app.authenticate, app.authorize('read', 'AbilityRule')],
    schema: { tags: ['Ability Rules'], response: { 200: z.array(selectAbilityRuleSchema), ...errors } }
  }, () => service.listRules())
  app.post<{ Body: CreateAbilityRule }>('/', {
    onRequest: [app.authenticate, app.authorize('manage', 'all')],
    preHandler: app.sameOrigin,
    schema: { tags: ['Ability Rules'], body: createAbilityRuleSchema, response: { 201: selectAbilityRuleSchema, ...errors } }
  }, async (request, reply) => {
    const rule = await service.createRule(request.body, request.authorization!)
    reply.code(201)
    return rule
  })
  app.get<{ Params: { ruleId: number } }>('/:ruleId', {
    onRequest: [app.authenticate, app.authorize('read', 'AbilityRule')],
    schema: { tags: ['Ability Rules'], params, response: { 200: selectAbilityRuleSchema, ...errors } }
  }, request => service.getRule(request.params.ruleId))
  app.patch<{ Params: { ruleId: number }, Body: PatchAbilityRule }>('/:ruleId', {
    onRequest: [app.authenticate, app.authorize('manage', 'all')],
    preHandler: app.sameOrigin,
    schema: { tags: ['Ability Rules'], params, body: patchAbilityRuleSchema, response: { 200: selectAbilityRuleSchema, ...errors } }
  }, request => service.updateRule(request.params.ruleId, request.body, request.authorization!))
  // eslint-disable-next-line drizzle/enforce-delete-with-where -- Fastify route, not a Drizzle query
  app.delete<{ Params: { ruleId: number } }>('/:ruleId', {
    onRequest: [app.authenticate, app.authorize('manage', 'all')],
    preHandler: app.sameOrigin,
    schema: { tags: ['Ability Rules'], params, response: { 204: z.void(), ...errors } }
  }, async (request, reply) => {
    await service.deleteRule(request.params.ruleId, request.authorization!)
    reply.code(204)
  })
}

export const authorizationCatalogRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  app.get('/catalog', {
    onRequest: [app.authenticate],
    schema: { tags: ['Authorization'], response: { 200: authorizationCatalogSchema, ...errors } }
  }, () => service.getCatalog())
}

export const currentAuthorizationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  app.get('/authorization', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['Authorization'],
      response: {
        200: currentAuthorizationSchema,
        401: httpErrorSchema,
        429: httpErrorSchema,
        500: httpErrorSchema
      }
    }
  }, async (request) => {
    const { user, roles, rules, authorizationVersion }
      = request.authorization ?? await app.loadAuthorization(request)
    return { user, roles, rules, authorizationVersion }
  })
}
