import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@monorepo-fastify-vue/api-client': path.resolve(
        __dirname,
        '../../packages/api-client/src/index.ts'
      )
    }
  },
  plugins: [
    vue()
  ],
  server: {
    proxy: {
      // Development stays same-origin; Vite forwards API calls to the API container.
      '/api': {
        target: process.env.API_PROXY_URL ?? 'http://localhost:3000',
        changeOrigin: false
      }
    }
  }
})
