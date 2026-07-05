import type { MiddlewareHandler } from "hono";

import * as HttpStatusCodes from "stoker/http-status-codes";

type RateLimitEntry = { count: number; resetAt: number };

const store = new Map<string, RateLimitEntry>();

type RateLimiterOptions = {
  limit: number;
  windowMs: number;
};

// In-process rate limiter — replace with Redis-backed store for multi-instance deployments
export function rateLimiter(options: RateLimiterOptions): MiddlewareHandler {
  return async (c, next) => {
    const forwarded = c.req.header("x-forwarded-for");
    const key = (forwarded ? forwarded.split(",")[0].trim() : null)
      ?? c.req.header("x-real-ip")
      ?? "unknown";
    const now = Date.now();

    // Prune expired entries to prevent unbounded memory growth
    for (const [k, v] of store) {
      if (now > v.resetAt)
        store.delete(k); // eslint-disable-line drizzle/enforce-delete-with-where
    }

    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (entry.count >= options.limit) {
      c.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ message: "Too many requests" }, HttpStatusCodes.TOO_MANY_REQUESTS);
    }

    entry.count++;
    return next();
  };
}
