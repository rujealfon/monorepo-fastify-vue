import type { ApiErrorSchema } from '@monorepo-fastify-vue/api-client'
import { RpcError } from '@monorepo-fastify-vue/api-client'

export async function fail(response: Response, error?: ApiErrorSchema) {
  if (!response.ok)
    throw new RpcError(response.status, error)
}
