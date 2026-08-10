import { createApiClient } from '@monorepo-fastify-vue/api-client'

let client: ReturnType<typeof createApiClient> | undefined

export function useApiClient() {
  const { public: { apiUrl } } = useRuntimeConfig()
  client ??= createApiClient(apiUrl)
  return client
}
