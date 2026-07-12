import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '#api/app.js'
import { db } from '#api/db/index.js'

describe('tasks routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
    await db.execute(sql`truncate table tasks restart identity cascade`)
  })

  afterAll(async () => {
    await app.close()
  })

  it('creates, lists, fetches, patches and deletes a task', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      payload: { name: 'buy milk', done: false }
    })
    expect(createResponse.statusCode).toBe(201)
    const created = createResponse.json()
    expect(created.name).toBe('buy milk')

    const listResponse = await app.inject({ method: 'GET', url: '/api/v1/tasks' })
    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json()).toMatchObject({
      data: [{ id: created.id }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    })

    const getResponse = await app.inject({ method: 'GET', url: `/api/v1/tasks/${created.id}` })
    expect(getResponse.statusCode).toBe(200)
    expect(getResponse.json().id).toBe(created.id)

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tasks/${created.id}`,
      payload: { done: true }
    })
    expect(patchResponse.statusCode).toBe(200)
    expect(patchResponse.json().done).toBe(true)

    const deleteResponse = await app.inject({ method: 'DELETE', url: `/api/v1/tasks/${created.id}` })
    expect(deleteResponse.statusCode).toBe(204)
  })

  it('returns 404 for a missing task', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/tasks/999999' })
    expect(response.statusCode).toBe(404)
  })

  it('returns 422 for an invalid body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      payload: { name: '', done: false }
    })
    expect(response.statusCode).toBe(422)
  })

  it('returns 422 for invalid pagination', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/tasks?page=0&limit=101' })
    expect(response.statusCode).toBe(422)
  })
})
