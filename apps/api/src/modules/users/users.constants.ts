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
  skipOnError: false
} as const

export const HANDOFF_EXCHANGE_RATE_LIMIT = {
  max: 10,
  timeWindow: '1 minute',
  skipOnError: false
} as const
