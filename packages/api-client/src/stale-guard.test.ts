import { describe, expect, it } from 'vitest'

import { createStaleGuard } from './stale-guard.js'

describe('stale guard', () => {
  it('treats a token current until another read starts or a write invalidates it', () => {
    const guard = createStaleGuard()
    const token = guard.start()
    expect(guard.isCurrent(token)).toBe(true)
  })

  it('makes an earlier read stale once a later read starts', () => {
    const guard = createStaleGuard()
    const first = guard.start()
    const second = guard.start()
    expect(guard.isCurrent(first)).toBe(false)
    expect(guard.isCurrent(second)).toBe(true)
  })

  it('makes an in-flight read stale once a write invalidates it, even if the read resolves after', () => {
    const guard = createStaleGuard()
    const inFlightRead = guard.start()
    guard.invalidate()
    expect(guard.isCurrent(inFlightRead)).toBe(false)
  })
})
