import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '#api/app.js'
import { db } from '#api/db/index.js'

function cookie(response: { headers: Record<string, number | string | string[] | undefined> }) {
  return String(response.headers['set-cookie']).split(';')[0]
}

describe('tasks routes', () => {
  let app: FastifyInstance
  let auth: Record<string, string>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
    await db.execute(sql`truncate table tasks restart identity cascade`)
    await db.execute(sql`truncate table users cascade`)

    const registration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'tasks-owner@example.com', password: 'correct horse battery staple' }
    })
    auth = { cookie: cookie(registration) }
  })

  afterAll(async () => {
    await app.close()
  })

  it('rejects unauthenticated requests', async () => {
    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/tasks' }),
      app.inject({ method: 'POST', url: '/api/v1/tasks', payload: { name: 'buy milk' } })
    ])
    expect(responses.map(response => response.statusCode)).toEqual([401, 401])
  })

  it('creates, lists, fetches, patches and deletes a task', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: auth,
      payload: { name: 'buy milk', done: false }
    })
    expect(createResponse.statusCode).toBe(201)
    const created = createResponse.json()
    expect(created.name).toBe('buy milk')

    const listResponse = await app.inject({ method: 'GET', url: '/api/v1/tasks', headers: auth })
    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json()).toMatchObject({
      data: [{ id: created.id }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    })

    const getResponse = await app.inject({ method: 'GET', url: `/api/v1/tasks/${created.id}`, headers: auth })
    expect(getResponse.statusCode).toBe(200)
    expect(getResponse.json().id).toBe(created.id)

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tasks/${created.id}`,
      headers: auth,
      payload: { done: true }
    })
    expect(patchResponse.statusCode).toBe(200)
    expect(patchResponse.json().done).toBe(true)

    const deleteResponse = await app.inject({ method: 'DELETE', url: `/api/v1/tasks/${created.id}`, headers: auth })
    expect(deleteResponse.statusCode).toBe(204)
  })

  it('returns 404 for a missing task', async () => {
    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/tasks/999999', headers: auth }),
      app.inject({ method: 'PATCH', url: '/api/v1/tasks/999999', headers: auth, payload: { done: true } }),
      app.inject({ method: 'DELETE', url: '/api/v1/tasks/999999', headers: auth })
    ])
    expect(responses.map(response => response.statusCode)).toEqual([404, 404, 404])
  })

  it('returns 422 for an invalid body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      headers: auth,
      payload: { name: '', done: false }
    })
    expect(response.statusCode).toBe(422)
    expect(response.json()).toMatchObject({ statusCode: 422, message: 'Validation failed' })

    const emptyPatch = await app.inject({ method: 'PATCH', url: '/api/v1/tasks/1', headers: auth, payload: {} })
    expect(emptyPatch.statusCode).toBe(422)
  })

  it('returns 422 for invalid pagination', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/tasks?page=0&limit=101', headers: auth })
    expect(response.statusCode).toBe(422)
  })

  it('returns ordered pages and empty out-of-range pages', async () => {
    for (const name of ['first', 'second', 'third'])
      await app.inject({ method: 'POST', url: '/api/v1/tasks', headers: auth, payload: { name } })

    const secondPage = await app.inject({ method: 'GET', url: '/api/v1/tasks?page=2&limit=1', headers: auth })
    expect(secondPage.json()).toMatchObject({
      data: [{ name: 'second' }],
      pagination: { page: 2, limit: 1, total: 3, totalPages: 3 }
    })

    const outOfRange = await app.inject({ method: 'GET', url: '/api/v1/tasks?page=99&limit=1', headers: auth })
    expect(outOfRange.json()).toMatchObject({
      data: [],
      pagination: { page: 99, limit: 1, total: 3, totalPages: 3 }
    })
  })
})
