import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // Comma-separated origins allowed to call the API with credentials (e.g.
  // "https://app.mysite.com,https://mysite.com"). API, web, and site deploy as
  // separate Vercel projects/origins, so the API needs an explicit CORS allowlist.
  CORS_ORIGIN: z.string().min(1).optional(),
  // Shared parent domain for the session cookie (e.g. ".mysite.com"), so web
  // (app.mysite.com) and site (mysite.com) both receive it. Leave unset when web
  // and site aren't deployed under one registrable domain (e.g. *.vercel.app
  // preview/project domains, each its own public-suffix entry) — an explicit
  // Domain there would just make the cookie invalid. Unset keeps the current
  // host-only cookie, scoped only to whichever origin issued it.
  COOKIE_DOMAIN: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  // Backs the rate-limit store through the ioredis client. Required in production
  // because Vercel runs the API as isolated
  // serverless instances with no shared memory, so the default in-memory store would
  // let each instance enforce its own limit instead of one global limit.
  REDIS_URL: z.string().min(1).optional(),
  // How long a web->site handoff token (see modules/users) stays redeemable.
  // Short-lived and single-use by design: it only needs to survive one
  // click-to-page-load round trip, not sit around as a reusable credential.
  HANDOFF_TOKEN_TTL_SECONDS: z.coerce.number().default(60)
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && !env.REDIS_URL) {
    ctx.addIssue({
      code: 'custom',
      path: ['REDIS_URL'],
      message: 'REDIS_URL is required in production for the shared rate-limit store'
    })
  }

  if (env.NODE_ENV === 'production' && !env.CORS_ORIGIN) {
    ctx.addIssue({
      code: 'custom',
      path: ['CORS_ORIGIN'],
      message: 'CORS_ORIGIN is required in production since web and API deploy to separate origins'
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

export const config = {
  ...parsed.data,
  // Parsed once here rather than at each call site (CORS registration, the
  // sameOrigin check) so both agree on exactly the same allowlist.
  CORS_ORIGINS: parsed.data.CORS_ORIGIN?.split(',').map(origin => origin.trim()).filter(Boolean) ?? []
}
export type Config = typeof config
