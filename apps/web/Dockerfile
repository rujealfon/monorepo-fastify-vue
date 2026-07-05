FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY apps/api/src/ ./apps/api/src/
COPY apps/web/ ./apps/web/

# --- Production build ---
FROM base AS build
RUN pnpm --filter @tech-full-stack/web build

FROM nginx:alpine AS production
COPY --from=build /app/apps/api/public /usr/share/nginx/html
EXPOSE 80

# --- Development ---
FROM base AS development
EXPOSE 5173
CMD ["pnpm", "--filter", "@tech-full-stack/web", "exec", "vite", "--host", "0.0.0.0"]
