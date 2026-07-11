export class RpcError extends Error {
  constructor(public status: number) {
    super(`API request failed with HTTP ${status}`)
  }
}

export type ApiErrorSchema = {
  statusCode: number
  error: string
  message: string
  details?: unknown
}
