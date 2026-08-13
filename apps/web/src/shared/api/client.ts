import { createApiClient, createHealthClient, createSessionClient } from '@monorepo-fastify-vue/api-client'

const transport = createApiClient('')
export const healthClient = createHealthClient(transport)
export const sessionClient = createSessionClient(transport)
