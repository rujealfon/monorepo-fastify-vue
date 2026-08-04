import { existsSync } from 'node:fs'
import { join } from 'node:path'

// Nuxt's dev server (Nitro) is the actual TLS listener, not Vite, so
// vite-plugin-mkcert's own https wiring never takes effect here even when
// registered as a Vite plugin. Point devServer.https directly at the cert web
// provisions (apps/web/vite.config.ts), shared via the repo-root .certs/ dir
// (gitignored: it holds a private key). Run web's dev server once first so
// the cert exists; until then this falls back to HTTP.
const mkcertDir = join(import.meta.dirname, '../../.certs')
const mkcertKey = join(mkcertDir, 'dev.pem')
const mkcertCert = join(mkcertDir, 'cert.pem')
const hasMkcert = existsSync(mkcertKey) && existsSync(mkcertCert)

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  ui: {},
  devServer: hasMkcert ? { https: { key: mkcertKey, cert: mkcertCert } } : undefined
})
