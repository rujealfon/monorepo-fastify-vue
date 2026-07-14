import type { ApiErrorSchema } from '@monorepo-fastify-vue/api-client'
import { createApiClient, RpcError } from '@monorepo-fastify-vue/api-client'

export const api = createApiClient(import.meta.env.VITE_API_BASE_URL ?? '')

export async function fail(response: Response, error?: ApiErrorSchema) {
  if (!response.ok)
    throw new RpcError(response.status, error)
}
