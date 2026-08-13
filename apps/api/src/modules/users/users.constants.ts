// Stricter than security.ts's global default (max: 100/minute, skipOnError: true)
// because these routes gate Argon2 password hashing/verification. skipOnError:
// false makes them fail closed on a rate-limit store outage instead of admitting
// unlimited hashing work — see security.ts's rate-limit registration for why the
// global default fails open instead.
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
