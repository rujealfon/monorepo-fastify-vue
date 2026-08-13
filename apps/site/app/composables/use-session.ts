import type { User } from '@monorepo-fastify-vue/api-client'

import { createApiClient, createSessionClient, createStaleGuard, RpcError } from '@monorepo-fastify-vue/api-client'

let client: ReturnType<typeof createSessionClient> | undefined
let fetched = false
// Logout can resolve before an in-flight refresh() does. The guard makes that
// refresh a no-op instead of overwriting the just-cleared User — see
// apps/web/src/features/session's cancelCurrentUser for the same invariant.
const staleGuard = createStaleGuard()

export function useSession() {
  const { public: { apiUrl } } = useRuntimeConfig()
  client ??= createSessionClient(createApiClient(apiUrl))
  const sessionClient = client

  const user = useState<User | null>('session-user', () => null)
  const error = useState<RpcError | null>('session-error', () => null)

  async function refresh() {
    const token = staleGuard.start()
    try {
      const result = await sessionClient.currentUser()
      if (!staleGuard.isCurrent(token))
        return
      user.value = result
      error.value = null
    }
    catch (failure) {
      if (!staleGuard.isCurrent(token))
        return
      error.value = failure instanceof RpcError ? failure : new RpcError(0, undefined, { cause: failure })
    }
  }

  async function logout() {
    staleGuard.invalidate()
    try {
      await sessionClient.logout()
      error.value = null
    }
    finally {
      user.value = null
    }
  }

  if (import.meta.client && !fetched) {
    fetched = true
    void refresh()
  }

  return { error, logout, refresh, user }
}
