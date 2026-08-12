import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ExchangeHandoff, LoginUser, PatchProfile, RegisterUser } from './users.schema.js'

import { config } from '#api/config/index.js'
import { SESSION_COOKIE } from '#api/plugins/auth.js'

import { UnauthorizedError } from './users.errors.js'
import * as service from './users.service.js'

export async function register(request: FastifyRequest<{ Body: RegisterUser }>, reply: FastifyReply) {
  await service.register(request.body)
  reply.code(202)
  return { message: 'Registration request accepted' }
}

export async function login(request: FastifyRequest<{ Body: LoginUser }>, reply: FastifyReply) {
  const user = await service.login(request.body)
  await request.server.setSession(reply, user.id)
  return user
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  await request.server.revokeSession(request)
  reply.clearCookie(SESSION_COOKIE, {
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
    path: '/'
  }).code(204)
}

export function profile(request: FastifyRequest) {
  return service.getProfile(request.user.sub)
}

export function patchProfile(request: FastifyRequest<{ Body: PatchProfile }>) {
  return service.updateProfile(request.user.sub, request.body)
}

export async function mintHandoff(request: FastifyRequest) {
  // COOKIE_DOMAIN means the session cookie is already shared with site directly
  // (see plugins/auth.ts) -- minting would just have site redeem an unused
  // token into a redundant extra session. Skipping it here, rather than via a
  // separate opt-out on web, keeps COOKIE_DOMAIN the single source of truth.
  if (config.COOKIE_DOMAIN)
    return { token: null }

  if (!request.server.redis)
    throw request.server.httpErrors.serviceUnavailable('Handoff is not configured')

  const token = await service.mintHandoffToken(request.server.redis, request.user.sub)
  return { token }
}

export async function exchangeHandoff(request: FastifyRequest<{ Body: ExchangeHandoff }>, reply: FastifyReply) {
  if (!request.server.redis)
    throw request.server.httpErrors.serviceUnavailable('Handoff is not configured')

  const userId = await service.redeemHandoffToken(request.server.redis, request.body.token)
  if (!userId)
    throw new UnauthorizedError()

  await request.server.setSession(reply, userId)
  return service.getProfile(userId)
}
