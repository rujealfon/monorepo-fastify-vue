import { RpcError } from '@monorepo-fastify-vue/api-client'

export async function fail(response: Response) {
  if (!response.ok)
    throw new RpcError(response.status)
}
