import type { FastifyInstance } from 'fastify'

import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '#api/app.js'
import { db } from '#api/db/index.js'
import { profiles, users } from '#api/modules/users'

const password = 'correct horse battery staple'

function cookie(response: { headers: Record<string, number | string | string[] | undefined> }) {
  return String(response.headers['set-cookie']).split(';')[0]
}

describe('user routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
    await db.execute(sql`delete from users`)
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
      profile: { firstName: null, lastName: null, gender: null, birthDate: null, bio: null }
    })
    expect(registration.body).not.toContain('passwordHash')
    expect(registration.headers['set-cookie']).toEqual(expect.stringContaining('HttpOnly'))
    expect(registration.headers['set-cookie']).toEqual(expect.stringContaining('SameSite=Strict'))
    expect(registration.headers['set-cookie']).toEqual(expect.stringContaining('Path=/'))
    expect(registration.headers['set-cookie']).toEqual(expect.stringContaining('Max-Age=604800'))

    const [storedUser] = await db.select().from(users).where(eq(users.email, 'person@example.com'))
    const [storedProfile] = await db.select().from(profiles).where(eq(profiles.userId, storedUser.id))
    expect(storedProfile).toBeDefined()
    expect(storedUser.passwordHash).not.toBe(password)
    expect(storedUser.passwordHash).toMatch(/^\$argon2id\$/)

    const sessionCookie = cookie(registration)
    const profile = await app.inject({ method: 'GET', url: '/api/v1/profile', headers: { cookie: sessionCookie } })
    expect(profile.statusCode).toBe(200)

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: ' PERSON@example.com ', password }
    })
    expect(login.statusCode).toBe(200)
    expect(login.json()).toMatchObject({ id: storedUser.id, email: 'person@example.com' })
    expect(login.headers['set-cookie']).toEqual(expect.stringContaining('HttpOnly'))

    const updated = await app.inject({
      method: 'PATCH',
      url: '/api/v1/profile',
      headers: { cookie: sessionCookie },
      payload: {
        firstName: '  Updated  ',
        lastName: '  Person  ',
        gender: 'prefer_not_to_say',
        birthDate: '1990-05-20',
        bio: '  Hello  '
      }
    })
    expect(updated.json().profile).toMatchObject({
      firstName: 'Updated',
      lastName: 'Person',
      gender: 'prefer_not_to_say',
      birthDate: '1990-05-20',
      bio: 'Hello'
    })

    const cleared = await app.inject({
      method: 'PATCH',
      url: '/api/v1/profile',
      headers: { cookie: sessionCookie },
      payload: { firstName: null, bio: null }
    })
    expect(cleared.json().profile).toMatchObject({ firstName: null, bio: null, lastName: 'Person' })

    const emptyPatch = await app.inject({
      method: 'PATCH',
      url: '/api/v1/profile',
      headers: { cookie: sessionCookie },
      payload: {}
    })
    expect(emptyPatch.statusCode).toBe(422)

    const logout = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: sessionCookie } })
    expect(logout.statusCode).toBe(204)
    expect(logout.headers['set-cookie']).toEqual(expect.stringContaining('Expires=Thu, 01 Jan 1970'))
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

    const missing = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: '203.0.113.30',
      payload: { email: 'missing@example.com', password }
    })
    expect(missing.statusCode).toBe(401)
    expect(missing.json().message).toBe(invalid.json().message)
  })

  it('rejects missing, invalid, expired and cross-site sessions', async () => {
    const missing = await app.inject({ method: 'GET', url: '/api/v1/profile' })
    const invalid = await app.inject({ method: 'GET', url: '/api/v1/profile', headers: { cookie: 'session=invalid' } })
    const expiredToken = app.jwt.sign({ sub: '00000000-0000-0000-0000-000000000000' }, { expiresIn: -1 })
    const expired = await app.inject({ method: 'GET', url: '/api/v1/profile', headers: { cookie: `session=${expiredToken}` } })
    expect([missing.statusCode, invalid.statusCode, expired.statusCode]).toEqual([401, 401, 401])

    const unknownToken = app.jwt.sign({ sub: '00000000-0000-0000-0000-000000000000' })
    const unknown = await app.inject({ method: 'GET', url: '/api/v1/profile', headers: { cookie: `session=${unknownToken}` } })
    expect(unknown.statusCode).toBe(401)

    const crossSite = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'origin': 'https://evil.example', 'sec-fetch-site': 'cross-site' },
      payload: { email: 'race@example.com', password }
    })
    expect(crossSite.statusCode).toBe(403)

    const originOnly = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { origin: 'https://evil.example' },
      payload: { email: 'race@example.com', password }
    })
    expect(originOnly.statusCode).toBe(403)

    const registration = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: '203.0.113.20',
      payload: { email: 'csrf-profile@example.com', password }
    })
    const profilePatch = await app.inject({
      method: 'PATCH',
      url: '/api/v1/profile',
      remoteAddress: '203.0.113.20',
      headers: { cookie: cookie(registration), origin: 'https://evil.example' },
      payload: { firstName: 'Blocked' }
    })
    expect(profilePatch.statusCode).toBe(403)
  })

  it('applies exact per-IP registration and login limits', async () => {
    const registrations = []
    for (let index = 0; index < 6; index++) {
      registrations.push(await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        remoteAddress: '203.0.113.1',
        payload: { email: `limit-${index}@example.com`, password }
      }))
    }
    expect(registrations.slice(0, 5).map(response => response.statusCode)).toEqual([201, 201, 201, 201, 201])
    expect(registrations[5].statusCode).toBe(429)

    const otherIp = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      remoteAddress: '203.0.113.2',
      payload: { email: 'other-ip@example.com', password }
    })
    expect(otherIp.statusCode).toBe(201)

    const logins = []
    for (let attempt = 0; attempt < 11; attempt++) {
      logins.push(await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        remoteAddress: '203.0.113.3',
        payload: { email: 'nobody@example.com', password }
      }))
    }
    expect(logins.slice(0, 10).every(response => response.statusCode === 401)).toBe(true)
    expect(logins[10].statusCode).toBe(429)
  })
})
