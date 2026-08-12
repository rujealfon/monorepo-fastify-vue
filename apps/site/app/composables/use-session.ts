import type { User } from '@monorepo-fastify-vue/api-client'

import { createApiClient, createSessionClient, RpcError } from '@monorepo-fastify-vue/api-client'

let client: ReturnType<typeof createSessionClient> | undefined
let fetched = false

export function useSession() {
  const { public: { apiUrl } } = useRuntimeConfig()
  client ??= createSessionClient(createApiClient(apiUrl))

  const user = useState<User | null>('session-user', () => null)
  const error = useState<RpcError | null>('session-error', () => null)

  async function refresh() {
    try {
      user.value = await client!.currentUser()
      error.value = null
    }
    catch (failure) {
      error.value = failure instanceof RpcError ? failure : new RpcError(0)
    }
  }

  async function logout() {
    await client!.logout()
    user.value = null
    error.value = null
  }

  if (import.meta.client && !fetched) {
    fetched = true
    void refresh()
  }

  return { error, logout, user }
}
