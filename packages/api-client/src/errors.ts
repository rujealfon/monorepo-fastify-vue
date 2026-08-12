import type { components } from './schema.js'

type HttpError = components['schemas']['HttpError']
type ValidationError = components['schemas']['ValidationError']

export class RpcError extends Error {
  constructor(public status: number, public body?: ApiErrorSchema, options?: ErrorOptions) {
    super(body?.message ?? (status === 0 ? 'API request failed' : `API request failed with HTTP ${status}`), options)
  }
}

export type ApiErrorSchema = HttpError & { details?: ValidationError['details'] }

export async function rpcRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request()
  }
  catch (error) {
    if (error instanceof RpcError)
      throw error
    throw new RpcError(0, undefined, { cause: error })
  }
}
