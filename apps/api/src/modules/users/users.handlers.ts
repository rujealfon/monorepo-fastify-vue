import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ChangeRole, LoginUser, PatchProfile, RegisterUser, UserIdParams, UsersPageQuery } from './users.schema.js'

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

// requirePermission always runs before these handlers, so request.auth is set
function actor(request: FastifyRequest): service.Actor {
  return request.auth!
}

export function listUsers(request: FastifyRequest<{ Querystring: UsersPageQuery }>) {
  return service.listUsers(request.query.page, request.query.limit)
}

export function changeRole(request: FastifyRequest<{ Params: UserIdParams, Body: ChangeRole }>) {
  return service.changeUserRole(actor(request), request.params.id, request.body.roleId)
}

export async function removeUser(request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
  await service.deleteUser(actor(request), request.params.id)
  reply.code(204)
}
