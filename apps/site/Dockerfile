FROM node:24.18.0-alpine AS base

RUN corepack enable && corepack prepare pnpm@11.18.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY apps/site/package.json ./apps/site/package.json

RUN pnpm install --frozen-lockfile

# Unlike web (which aliases @monorepo-fastify-vue/api-client straight to its
# TS source via vite.config.ts), site resolves it through normal node module
# resolution -> package.json's "main": "./dist/index.js", so the package must
# be built here. .dockerignore excludes **/dist from the build context, so a
# dist built on the host never reaches the image. Required specifically for
# the development target below, whose CMD runs `nuxt dev` directly rather
# than through apps/site/package.json's own build script (which also builds
# this as its first step) -- the production build stage re-runs it via that
# script, redundant but harmless there since it's already fresh.
RUN pnpm --filter @monorepo-fastify-vue/api-client build

COPY apps/site/ ./apps/site/

# --- Production build ---
FROM base AS build
RUN pnpm --filter @monorepo-fastify-vue/site build

FROM nginx:alpine AS production
COPY --from=build /app/apps/site/.output/public /usr/share/nginx/html
EXPOSE 80

# --- Development ---
FROM base AS development
EXPOSE 3000
CMD ["pnpm", "--filter", "@monorepo-fastify-vue/site", "exec", "nuxt", "dev", "--host", "0.0.0.0"]
