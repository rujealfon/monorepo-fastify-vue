export const REGISTER_RATE_LIMIT = {
  max: 5,
  timeWindow: '1 minute',
  skipOnError: false
} as const

export const LOGIN_RATE_LIMIT = {
  max: 10,
  timeWindow: '1 minute',
  skipOnError: false
} as const

export const HANDOFF_MINT_RATE_LIMIT = {
  max: 30,
  timeWindow: '1 minute',
  skipOnError: false,
  // Runs as preHandler instead of the default onRequest, so it executes after
  // this route's onRequest: [app.authenticate] has populated request.user --
  // letting users.routes.ts key it by user id instead of IP. Minting is
  // authenticated and only ever fires on a real navigation click, so IP
  // scoping would let many legitimate users behind one NAT/VPN exhaust each
  // other's shared budget instead of limiting each user's own usage.
  hook: 'preHandler'
} as const

export const HANDOFF_EXCHANGE_RATE_LIMIT = {
  max: 10,
  timeWindow: '1 minute',
  skipOnError: false
} as const
