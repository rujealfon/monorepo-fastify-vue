# Web

The Vue 3/Vite app renders the health feature at `/`. Unknown client paths redirect to `/`.

The health screen uses Pinia Colada for typed server state, refreshes automatically, preserves stale-data error semantics, and supports a manual check. Nuxt UI provides the application shell and color-mode control.

```bash
pnpm --filter @monorepo-fastify-vue/web dev
pnpm --filter @monorepo-fastify-vue/web test
pnpm --filter @monorepo-fastify-vue/web build
```

During development, Vite proxies `/api` to `API_PROXY_URL` or `http://localhost:3000`.
