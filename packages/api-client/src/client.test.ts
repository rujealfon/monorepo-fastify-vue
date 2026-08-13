import { describe, expect, it, vi } from 'vitest'

const createClient = vi.hoisted(() => vi.fn(() => ({ GET: vi.fn(), PATCH: vi.fn(), POST: vi.fn() })))
vi.mock('openapi-fetch', () => ({ default: createClient }))

const { createApiClient } = await import('./client.js')

describe('createApiClient', () => {
  it('sends credentials on every request, required for site to call the API cross-origin', () => {
    createApiClient('https://api.example.com')

    expect(createClient).toHaveBeenCalledWith({ baseUrl: 'https://api.example.com', credentials: 'include' })
  })
})
