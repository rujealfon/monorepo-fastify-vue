import type { FastifyInstance } from 'fastify'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '#api/app.js'
import { db } from '#api/db/index.js'

const password = 'correct horse battery staple'

function cookie(response: { headers: Record<string, number | string | string[] | undefined> }) {
  return String(response.headers['set-cookie']).split(';')[0]
}

describe('user routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
    await db.execute(sql`truncate table users cascade`)
  })

  afterAll(async () => app.close())

  it('registers a normalized user, logs in, updates the profile and logs out', async () => {
    const registration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: '  Person@Example.COM ', password }
    })
    expect(registration.statusCode).toBe(201)
    expect(registration.json()).toMatchObject({
      email: 'person@example.com',
      profile: { firstName: null, lastName: null, sex: null, birthDate: null, bio: null }
    })
    expect(registration.body).not.toContain('passwordHash')
    expect(registration.headers['set-cookie']).toEqual(expect.stringContaining('HttpOnly'))
    expect(registration.headers['set-cookie']).toEqual(expect.stringContaining('SameSite=Strict'))
    expect(registration.headers['set-cookie']).toEqual(expect.stringContaining('Path=/'))
    expect(registration.headers['set-cookie']).toEqual(expect.stringContaining('Max-Age=604800'))

    const sessionCookie = cookie(registration)
    const profile = await app.inject({ method: 'GET', url: '/api/v1/profile', headers: { cookie: sessionCookie } })
    expect(profile.statusCode).toBe(200)

    const updated = await app.inject({
      method: 'PATCH',
      url: '/api/v1/profile',
      headers: { cookie: sessionCookie },
      payload: {
        firstName: '  Updated  ',
        lastName: '  Person  ',
        sex: 'prefer_not_to_say',
        birthDate: '1990-05-20',
        bio: '  Hello  '
      }
    })
    expect(updated.json().profile).toMatchObject({
      firstName: 'Updated',
      lastName: 'Person',
      sex: 'prefer_not_to_say',
      birthDate: '1990-05-20',
      bio: 'Hello'
    })

    const logout = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: sessionCookie } })
    expect(logout.statusCode).toBe(204)
    expect(logout.headers['set-cookie']).toEqual(expect.stringContaining('Max-Age=0'))
  })

  it('maps duplicate races and invalid credentials to stable errors', async () => {
    const payload = { email: 'race@example.com', password }
    const responses = await Promise.all([
      app.inject({ method: 'POST', url: '/api/v1/auth/register', payload }),
      app.inject({ method: 'POST', url: '/api/v1/auth/register', payload })
    ])
    expect(responses.map(response => response.statusCode).sort()).toEqual([201, 409])

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: payload.email, password: 'incorrect password' }
    })
    expect(invalid.statusCode).toBe(401)
    expect(invalid.json().message).toBe('Invalid credentials or session')
  })

  it('rejects missing, invalid, expired and cross-site sessions', async () => {
    const missing = await app.inject({ method: 'GET', url: '/api/v1/profile' })
    const invalid = await app.inject({ method: 'GET', url: '/api/v1/profile', headers: { cookie: 'session=invalid' } })
    const expiredToken = app.jwt.sign({ sub: '00000000-0000-0000-0000-000000000000' }, { expiresIn: -1 })
    const expired = await app.inject({ method: 'GET', url: '/api/v1/profile', headers: { cookie: `session=${expiredToken}` } })
    expect([missing.statusCode, invalid.statusCode, expired.statusCode]).toEqual([401, 401, 401])

    const crossSite = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'origin': 'https://evil.example', 'sec-fetch-site': 'cross-site' },
      payload: { email: 'race@example.com', password }
    })
    expect(crossSite.statusCode).toBe(403)
  })

  it('applies stricter registration and login limits', async () => {
    const registrations = await Promise.all(Array.from({ length: 6 }, (_, index) => app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: `limit-${index}@example.com`, password }
    })))
    expect(registrations.some(response => response.statusCode === 429)).toBe(true)

    const logins = await Promise.all(Array.from({ length: 11 }, () => app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@example.com', password }
    })))
    expect(logins.some(response => response.statusCode === 429)).toBe(true)
  })
})
