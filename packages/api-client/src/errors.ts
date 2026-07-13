import type { components } from './schema.js'

type HttpError = components['schemas']['HttpError']
type ValidationError = components['schemas']['ValidationError']

export class RpcError extends Error {
  constructor(public status: number, public body?: ApiErrorSchema) {
    super(body?.message ?? `API request failed with HTTP ${status}`)
  }
}

export type ApiErrorSchema = HttpError & { details?: ValidationError['details'] }
