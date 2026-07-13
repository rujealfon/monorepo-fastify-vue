import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AdminUsersPageQuery, LoginUser, PatchProfile, PatchUserRole, RegisterUser } from './users.schema.js'

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

export async function logout(_request: FastifyRequest, reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: '/' }).code(204)
}

export function profile(request: FastifyRequest) {
  return service.getProfile(request.user.sub)
}

export function patchProfile(request: FastifyRequest<{ Body: PatchProfile }>) {
  return service.updateProfile(request.user.sub, request.body)
}

export function listUsers(request: FastifyRequest<{ Querystring: AdminUsersPageQuery }>) {
  return service.listUsers(request.query.page, request.query.limit)
}

export function patchUserRole(request: FastifyRequest<{ Params: { id: string }, Body: PatchUserRole }>) {
  return service.changeUserRole(request.actor, request.params.id, request.body.role)
}

export async function removeUser(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await service.deleteUser(request.actor, request.params.id)
  reply.code(204)
}
