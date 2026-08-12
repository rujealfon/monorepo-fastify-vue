import type { ApiClient } from './client.js'
import type { HealthResponse } from './health/types.js'

import { expectData } from './errors.js'

export function createHealthClient(client: ApiClient) {
  return {
    live(): Promise<HealthResponse> {
      return expectData(() => client.GET('/api/v1/health/live'))
    }
  }
}

export type HealthClient = ReturnType<typeof createHealthClient>
