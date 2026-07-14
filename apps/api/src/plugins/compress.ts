import compress from '@fastify/compress'
import fp from 'fastify-plugin'

export default fp(async (fastify) => {
  // Global compression with no per-route opt-out is a BREACH precondition if a response
  // ever reflects a secret (session token, CSRF value) alongside attacker-controlled input
  // in the same compressed body. Currently safe: the session token only ever appears in
  // the Set-Cookie header (see plugins/auth.ts setSession), never in a JSON response body.
  // If a future endpoint echoes a secret into JSON next to user-controlled input, exclude
  // that route from compression rather than relying on this being globally true.
  await fastify.register(compress)
})
