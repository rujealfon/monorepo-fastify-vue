import type { FastifyReply, FastifyRequest } from 'fastify'
import type { CreateRole, LoginUser, PatchProfile, PatchRole, RegisterUser, ReplaceUserRoles, UsersPageQuery } from './users.schema.js'

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

export function listUsers(request: FastifyRequest<{ Querystring: UsersPageQuery }>) {
  return service.listUsers(request.query.page, request.query.limit)
}

export function replaceUserRoles(request: FastifyRequest<{ Params: { id: string }, Body: ReplaceUserRoles }>) {
  return service.replaceUserRoles(request.user.sub, request.params.id, request.body)
}

export function listRoles() {
  return service.listRoles()
}

export function listPermissions() {
  return service.listPermissions()
}

export function createRole(request: FastifyRequest<{ Body: CreateRole }>, reply: FastifyReply) {
  reply.code(201)
  return service.createRole(request.body)
}

export function patchRole(request: FastifyRequest<{ Params: { id: string }, Body: PatchRole }>) {
  return service.updateRole(request.user.sub, request.params.id, request.body)
}

export async function deleteRole(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await service.deleteRole(request.params.id)
  reply.code(204)
}
