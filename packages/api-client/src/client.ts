import type { paths } from './schema.js'

import createClient from 'openapi-fetch'

export function createApiClient(baseUrl: string) {
  // 'include' is required for cross-origin callers (e.g. site hitting the API's
  // real origin directly) to send the session cookie; same-origin callers that
  // go through a same-origin proxy (e.g. web) are unaffected since 'include'
  // behaves like the default 'same-origin' mode there.
  return createClient<paths>({ baseUrl, credentials: 'include' })
}

export type ApiClient = ReturnType<typeof createApiClient>
