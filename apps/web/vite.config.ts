import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import ui from '@nuxt/ui/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

// vite-plugin-mkcert always folds every locally-detected network IP into its
// host list, and a container's bridge IP changes on every restart, so calling
// it unconditionally forces a `mkcert -install` regenerate on every container
// start (which also fails on Alpine without ca-certificates, and only trusts
// the CA inside that ephemeral container anyway). Reuse the cert directly once
// it exists -- shared with site (apps/site/nuxt.config.ts) and api
// (apps/api/src/app.ts) via the repo-root .certs/ dir (gitignored: it holds a
// private key, and it's a bind-mount target, so it can't live under $HOME --
// that env var isn't portable to native Windows) -- and only fall back to the
// plugin to provision it the first time.
const mkcertDir = path.resolve(import.meta.dirname, '../../.certs')
const mkcertKey = path.join(mkcertDir, 'dev.pem')
const mkcertCert = path.join(mkcertDir, 'cert.pem')
const hasMkcert = existsSync(mkcertKey) && existsSync(mkcertCert)

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@monorepo-fastify-vue/api-client': path.resolve(
        import.meta.dirname,
        '../../packages/api-client/src/index.ts'
      )
    }
  },
  plugins: [
    vue(),
    ui(),
    ...(hasMkcert ? [] : [mkcert({ savePath: mkcertDir })])
  ],
  server: {
    https: hasMkcert
      ? { key: readFileSync(mkcertKey), cert: readFileSync(mkcertCert) }
      : undefined,
    proxy: {
      // Development stays same-origin; Vite forwards API calls to the API container.
      // The api dev server serves HTTPS-only once .certs/ exists (mirrors this
      // server's own hasMkcert check), and its cert doesn't cover docker's
      // internal 'api' hostname (only localhost/127.0.0.1), so verification is
      // skipped for this internal-only hop.
      '/api': {
        target: process.env.API_PROXY_URL ?? (hasMkcert ? 'https://localhost:3000' : 'http://localhost:3000'),
        changeOrigin: false,
        secure: false
      }
    }
  }
})
