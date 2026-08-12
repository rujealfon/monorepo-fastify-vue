FROM node:24.18.0-alpine AS base

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY apps/site/package.json ./apps/site/package.json

RUN pnpm install --frozen-lockfile

COPY apps/site/ ./apps/site/

# --- Production build ---
FROM base AS build
RUN pnpm --filter @monorepo-fastify-vue/site build

FROM nginx:alpine AS production
COPY --from=build /app/apps/site/.output/public /usr/share/nginx/html
EXPOSE 80

# --- Development ---
FROM base AS development
RUN pnpm --filter @monorepo-fastify-vue/api-client build
EXPOSE 3000
CMD ["pnpm", "--filter", "@monorepo-fastify-vue/site", "exec", "nuxt", "dev", "--host", "0.0.0.0"]
