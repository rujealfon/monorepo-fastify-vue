import type { components } from './schema.js'

type HttpError = components['schemas']['HttpError']
type ValidationError = components['schemas']['ValidationError']

export class RpcError extends Error {
  constructor(public status: number, public body?: ApiErrorSchema, options?: ErrorOptions) {
    super(body?.message ?? (status === 0 ? 'API request failed' : `API request failed with HTTP ${status}`), options)
  }
}

export type ApiErrorSchema = HttpError & { details?: ValidationError['details'] }

type TransportResult<T> = {
  data?: T
  error?: ApiErrorSchema
  response: Response
}

async function execute<T>(request: () => Promise<TransportResult<T>>): Promise<TransportResult<T>> {
  try {
    return await request()
  }
  catch (error) {
    if (error instanceof RpcError)
      throw error
    throw new RpcError(0, undefined, { cause: error })
  }
}

function extractData<T>(result: TransportResult<T>): T {
  if (!result.response.ok)
    throw new RpcError(result.response.status, result.error)
  if (result.data === undefined)
    throw new RpcError(result.response.status, undefined, { cause: new Error('Successful response contained no data') })
  return result.data
}

export async function expectData<T>(request: () => Promise<TransportResult<T>>): Promise<T> {
  return extractData(await execute(request))
}

export async function expectEmpty(request: () => Promise<TransportResult<unknown>>): Promise<void> {
  const result = await execute(request)
  if (!result.response.ok)
    throw new RpcError(result.response.status, result.error)
}

export async function expectOptional<T>(
  request: () => Promise<TransportResult<T>>,
  absentStatuses: readonly number[]
): Promise<T | null> {
  const result = await execute(request)
  if (absentStatuses.includes(result.response.status))
    return null
  return extractData(result)
}
