import { describe, expect, it } from 'vitest'
import router from './index'

describe('health router', () => {
  it('mounts health at the root path', async () => {
    await router.push('/')

    expect(router.currentRoute.value.name).toBe('health')
    expect(router.currentRoute.value.matched).toHaveLength(2)
  })

  it('redirects unknown client paths to the health page', async () => {
    await router.push('/unknown/path')

    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(router.currentRoute.value.name).toBe('health')
  })
})
