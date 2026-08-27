FROM node:24.18.0-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/package.json
COPY apps/app/package.json ./apps/app/package.json

RUN pnpm install --frozen-lockfile

COPY apps/api/src/ ./apps/api/src/
COPY apps/app/ ./apps/app/

# --- Production build ---
FROM base AS build
RUN pnpm --filter @monorepo-fastify-vue/app build

FROM nginx:alpine AS production
COPY --from=build /app/apps/app/dist /usr/share/nginx/html
EXPOSE 80

# --- Development ---
FROM base AS development
EXPOSE 5173
# api (see apps/api/src/app.ts) serves HTTPS only once the cert exists at its
# own startup -- the exact same bind-mounted files checked here -- so mirror
# that check to pick a scheme that always matches what api is actually
# serving instead of hardcoding one (see docker-compose.yml).
CMD ["sh", "-c", "if [ -f /app/.certs/dev.pem ] && [ -f /app/.certs/cert.pem ]; then export API_PROXY_URL=https://api:3000; else export API_PROXY_URL=http://api:3000; fi; exec pnpm --filter @monorepo-fastify-vue/app exec vite --host 0.0.0.0"]
