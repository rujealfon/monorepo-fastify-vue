import { createApiClient, createSessionClient } from '@monorepo-fastify-vue/api-client'

export const api = createApiClient('')
export const sessionClient = createSessionClient(api)
