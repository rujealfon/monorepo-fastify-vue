FROM node:24.18.0-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests for dependency installation
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile

# Copy API source
COPY apps/api/ ./apps/api/

# --- Production build ---
FROM base AS build
WORKDIR /app/apps/api
RUN pnpm build

FROM node:24.18.0-alpine AS production
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/packages/ ./packages/
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/apps/api/dist ./apps/api/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]

# --- Development (default) ---
FROM base AS development
EXPOSE 3000
CMD ["pnpm", "--filter", "@monorepo-fastify-vue/api", "exec", "tsx", "watch", "src/server.ts"]
