import fp from 'fastify-plugin'

import { runWithAuditRequestContext } from '#api/modules/audit-logs'

export default fp(async (fastify) => {
  fastify.addHook('onRequest', (request, _reply, done) => {
    runWithAuditRequestContext({
      ip: request.ip ?? null,
      userAgent: request.headers['user-agent']?.slice(0, 255) ?? null,
      requestId: String(request.id)
    }, done)
  })
})
