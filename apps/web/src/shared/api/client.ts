import { createApiClient } from '@monorepo-fastify-vue/api-client'

export const api = createApiClient(import.meta.env.VITE_API_BASE_URL ?? '')
