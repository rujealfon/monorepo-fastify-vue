import type { ApiErrorSchema } from '@monorepo-fastify-vue/api-client'
import { RpcError } from '@monorepo-fastify-vue/api-client'

export function assertOk(response: Response, error?: ApiErrorSchema) {
  if (!response.ok)
    throw new RpcError(response.status, error)
}

export function unwrap<T>(response: Response, data: T | undefined, error?: ApiErrorSchema): T {
  assertOk(response, error)
  if (data === undefined)
    throw new RpcError(response.status, error)
  return data
}
