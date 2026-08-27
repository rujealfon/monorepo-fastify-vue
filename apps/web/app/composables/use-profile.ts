import type { User } from '@monorepo-fastify-vue/api-client'
import { createApiClient, RpcError } from '@monorepo-fastify-vue/api-client'

let client: ReturnType<typeof createApiClient> | undefined
// Module-level, not a ref: this must fire exactly once per page load regardless
// of how many components call useProfile(), and only client-side — `nuxt
// generate` prerenders with no cookie to check, so an SSR fetch would always
// bake in a logged-out header into the static output.
let fetched = false

export function useProfile() {
  const { public: { apiUrl } } = useRuntimeConfig()
  client ??= createApiClient(apiUrl)

  const profile = useState<User | null>('profile', () => null)

  async function refresh() {
    try {
      const { data, response } = await client!.GET('/api/v1/profile/')
      profile.value = response.status === 401 || response.status === 403 ? null : (data ?? null)
    }
    catch {
      profile.value = null
    }
  }

  async function logout() {
    const { response } = await client!.POST('/api/v1/auth/logout')
    if (!response.ok)
      throw new RpcError(response.status)
    profile.value = null
  }

  if (import.meta.client && !fetched) {
    fetched = true
    void refresh()
  }

  return { profile, logout }
}
