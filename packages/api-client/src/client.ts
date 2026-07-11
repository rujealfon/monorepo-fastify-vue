import type { paths } from './schema.js'

import createClient from 'openapi-fetch'

export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl })
}

export type ApiClient = ReturnType<typeof createApiClient>
