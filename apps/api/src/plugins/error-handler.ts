import type { FastifyError, FastifyPluginAsync } from 'fastify'

import { STATUS_CODES } from 'node:http'

import fp from 'fastify-plugin'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'

import { config } from '#api/config/index.js'

const errorHandler: FastifyPluginAsync = async (app) => {
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.code(422).send({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Validation failed',
        details: error.validation
      })
    }

    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 && config.NODE_ENV !== 'development'
      ? 'Internal Server Error'
      : error.message

    request.log.error({ err: error }, 'request error')
    return reply.code(statusCode).send({
      statusCode,
      error: statusCode < 500 ? STATUS_CODES[statusCode] ?? error.name : error.name,
      message
    })
  })
}

export default fp(errorHandler)
