import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [{
      find: /^#api\/(.+)\.js$/,
      replacement: `${fileURLToPath(new URL('./src/', import.meta.url))}$1.ts`
    }]
  },
  test: {
    fileParallelism: false,
    setupFiles: ['./vitest.setup.ts']
  }
})
