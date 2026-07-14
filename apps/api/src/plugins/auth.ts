import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthorizationContext, PermissionKey, PolicyDecision } from '#api/modules/users'

import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import fp from 'fastify-plugin'

import { config } from '#api/config/index.js'
import { insertDecision } from '#api/modules/audit'
import { evaluatePolicyDecision, ForbiddenError, isTaskPermissionKey, resolveAuthorization, UnauthorizedError } from '#api/modules/users'

export const SESSION_COOKIE = 'session'
export const SESSION_SECONDS = 7 * 24 * 60 * 60

export default fp(async (fastify) => {
  await fastify.register(cookie)
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
    sign: { expiresIn: SESSION_SECONDS }
  })

  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify<{ sub: string }>()
    }
    catch {
      throw new UnauthorizedError()
    }
  })

  fastify.decorateRequest('authorization')

  fastify.decorate('auditDecision', async (request: FastifyRequest, permission: PermissionKey, decision: PolicyDecision, resourceType?: string, resourceId?: string, details: Record<string, unknown> = {}) => {
    try {
      await insertDecision({
        actorId: request.authorization.actor.id,
        actorEmail: request.authorization.actor.email,
        eventType: 'authorization.decision',
        outcome: decision.allowed ? 'allow' : 'deny',
        permission,
        resourceType: resourceType ?? permission.split('.')[0],
        resourceId,
        matchedAllowPolicyIds: decision.matchedAllowPolicyIds,
        matchedDenyPolicyIds: decision.matchedDenyPolicyIds,
        details
      })
    }
    catch (error) {
      request.log.error({ err: error, permission }, 'failed to write authorization audit event')
    }
  })

  fastify.decorate('authorize', (permission: PermissionKey) => async (request: FastifyRequest) => {
    await fastify.authenticate(request)
    const authorization = await resolveAuthorization(request.user.sub)
    if (!authorization)
      throw new UnauthorizedError()
    request.authorization = authorization
    if (isTaskPermissionKey(permission))
      return
    const decision = evaluatePolicyDecision(authorization, permission)
    await fastify.auditDecision(request, permission, decision)
    if (!decision.allowed)
      throw new ForbiddenError()
  })

  fastify.decorate('sameOrigin', async (request: FastifyRequest) => {
    if (request.headers['sec-fetch-site'] === 'cross-site')
      throw fastify.httpErrors.forbidden('Cross-site request rejected')

    const origin = request.headers.origin
    if (origin && origin !== `${request.protocol}://${request.host}`)
      throw fastify.httpErrors.forbidden('Cross-site request rejected')
  })

  fastify.decorate('setSession', (reply: FastifyReply, userId: string) => {
    const expires = new Date(Date.now() + SESSION_SECONDS * 1000)
    reply.setCookie(SESSION_COOKIE, fastify.jwt.sign({ sub: userId }), {
      expires,
      httpOnly: true,
      maxAge: SESSION_SECONDS,
      path: '/',
      sameSite: 'strict',
      secure: config.NODE_ENV === 'production'
    })
  })
})

declare module 'fastify' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>
    auditDecision: (request: FastifyRequest, permission: PermissionKey, decision: PolicyDecision, resourceType?: string, resourceId?: string, details?: Record<string, unknown>) => Promise<void>
    authorize: (permission: PermissionKey) => (request: FastifyRequest) => Promise<void>
    sameOrigin: (request: FastifyRequest) => Promise<void>
    setSession: (reply: FastifyReply, userId: string) => void
  }

  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyRequest {
    authorization: AuthorizationContext
  }
}

declare module '@fastify/jwt' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyJWT {
    payload: { sub: string }
    user: { sub: string }
  }
}
