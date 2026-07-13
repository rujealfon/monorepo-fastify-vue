import type { FormError } from '@nuxt/ui'
import { RpcError } from '@monorepo-fastify-vue/api-client'

export function apiFormErrors(error: unknown): FormError[] {
  if (!(error instanceof RpcError) || !Array.isArray(error.body?.details))
    return []

  return error.body.details.flatMap((detail) => {
    if (!detail || typeof detail !== 'object')
      return []

    const { instancePath, message } = detail as Record<string, unknown>
    return typeof instancePath === 'string' && instancePath.startsWith('/') && typeof message === 'string'
      ? [{ name: instancePath.slice(1).replaceAll('/', '.'), message }]
      : []
  })
}
