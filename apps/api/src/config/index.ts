import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // CORS_ORIGIN is only needed if the API and web app deploy to separate origins.
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  // Only needed by the db:seed script that creates/promotes the super admin account.
  SUPER_ADMIN_EMAIL: z.string().trim().toLowerCase().max(254).email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().min(12).max(128).optional()
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
