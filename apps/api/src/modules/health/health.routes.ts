import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const healthSchema = z.object({ status: z.literal('ok') })

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get('/live', {
    schema: {
      tags: ['Health'],
      response: { 200: healthSchema }
    }
  }, async () => ({ status: 'ok' as const }))
}
