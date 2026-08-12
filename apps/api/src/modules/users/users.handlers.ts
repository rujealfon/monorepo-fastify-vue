import type { FastifyReply, FastifyRequest } from 'fastify'
import type { LoginUser, PatchProfile, RegisterUser } from './users.schema.js'

import * as service from './users.service.js'

export async function register(request: FastifyRequest<{ Body: RegisterUser }>, reply: FastifyReply) {
  await service.register(request.body)
  reply.code(202)
  return { message: 'Registration request accepted' }
}

export async function login(request: FastifyRequest<{ Body: LoginUser }>, reply: FastifyReply) {
  const user = await service.login(request.body)
  await request.server.session.establish(reply, user.id)
  return user
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  await request.server.session.end(request, reply)
  reply.code(204)
}

export function profile(request: FastifyRequest) {
  return service.getProfile(request.user.sub)
}

export function patchProfile(request: FastifyRequest<{ Body: PatchProfile }>) {
  return service.updateProfile(request.user.sub, request.body)
}
