import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // CORS_ORIGIN is only needed if the API and web app deploy to separate origins.
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  AUDIT_DECISION_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  // Backs the rate-limit store (Valkey, accessed via the Redis-protocol-compatible
  // ioredis client). Required in production because Vercel runs the API as isolated
  // serverless instances with no shared memory, so the default in-memory store would
  // let each instance enforce its own limit instead of one global limit.
  VALKEY_URL: z.string().min(1).optional()
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && !env.VALKEY_URL) {
    ctx.addIssue({
      code: 'custom',
      path: ['VALKEY_URL'],
      message: 'VALKEY_URL is required in production for the shared rate-limit store'
    })
  }
})

// eslint-disable-next-line node/no-process-env
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
export type Config = typeof config
