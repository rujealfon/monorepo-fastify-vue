import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    conditions: ['development']
  },
  test: {
    fileParallelism: false,
    setupFiles: ['./vitest.setup.ts']
  }
})
