import type { paths } from './schema.js'

import createClient from 'openapi-fetch'

export function createApiClient(baseUrl: string) {
  // web app and API deploy to separate *.vercel.app subdomains (cross-site), and fetch
  // defaults to credentials: 'same-origin' — without 'include' the session cookie never
  // leaves the browser, so every request after the initial login response looks anonymous.
  return createClient<paths>({ baseUrl, credentials: 'include' })
}

export type ApiClient = ReturnType<typeof createApiClient>
