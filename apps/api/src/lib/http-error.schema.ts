import { z } from 'zod'

export const httpErrorSchema = z.object({
  statusCode: z.number().int().min(400).max(599),
  error: z.string(),
  message: z.string()
}).meta({ id: 'HttpError' })

export const validationErrorSchema = httpErrorSchema.extend({
  details: z.array(z.unknown())
}).meta({ id: 'ValidationError' })
