import { RpcError } from '@monorepo-fastify-vue/api-client'
import { describe, expect, it } from 'vitest'

import { apiFormErrors } from './form-errors'

describe('apiFormErrors', () => {
  it('translates a nested JSON pointer into a dot-separated field name', () => {
    const error = new RpcError(422, {
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: 'Validation failed',
      details: [{ instancePath: '/profile/firstName', message: 'Invalid first name' }]
    })

    expect(apiFormErrors(error)).toEqual([{ name: 'profile.firstName', message: 'Invalid first name' }])
  })

  it('returns no errors when the RpcError has no details array', () => {
    const error = new RpcError(500, { statusCode: 500, error: 'Internal Server Error', message: 'Unexpected' })

    expect(apiFormErrors(error)).toEqual([])
  })

  it('returns no errors for a non-RpcError failure', () => {
    expect(apiFormErrors(new Error('network down'))).toEqual([])
  })

  it('drops malformed detail entries instead of throwing', () => {
    const error = new RpcError(422, {
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: 'Validation failed',
      details: [
        { instancePath: '/email', message: 'Invalid email' },
        { instancePath: 42, message: 'not a string path' },
        { message: 'missing instancePath' },
        null
      ] as never
    })

    expect(apiFormErrors(error)).toEqual([{ name: 'email', message: 'Invalid email' }])
  })
})
