import type { FastifyReply, FastifyRequest } from 'fastify'
import type { LoginUser, PatchProfile, RegisterUser } from './users.schema.js'

import { recordAuditEvent } from '#api/modules/audit-logs'
import { SESSION_COOKIE } from '#api/plugins/auth.js'

import * as service from './users.service.js'

export async function register(request: FastifyRequest<{ Body: RegisterUser }>, reply: FastifyReply) {
  const user = await service.register(request.body)
  request.server.setSession(reply, user.id)
  reply.code(201)
  return user
}

export async function login(request: FastifyRequest<{ Body: LoginUser }>, reply: FastifyReply) {
  const user = await service.login(request.body)
  request.server.setSession(reply, user.id)
  return user
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  // logout has no authenticate hook: verify best-effort so anonymous calls still clear the cookie
  const actorId = await request.jwtVerify().then(() => request.user.sub).catch(() => null)
  if (actorId)
    await recordAuditEvent({ actorId, action: 'auth.logout', entityType: 'user', entityId: actorId })
  reply.clearCookie(SESSION_COOKIE, { path: '/' }).code(204)
}

export function profile(request: FastifyRequest) {
  return service.getProfile(request.authorization!)
}

export function patchProfile(request: FastifyRequest<{ Body: PatchProfile }>) {
  return service.updateProfile(request.authorization!, request.body)
}
