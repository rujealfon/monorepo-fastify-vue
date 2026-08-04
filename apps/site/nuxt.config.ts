import { existsSync } from 'node:fs'
import { join } from 'node:path'

// Nuxt's dev server (Nitro) is the actual TLS listener, not Vite, so a Vite
// plugin can't wire up https here. Point devServer.https directly at the leaf
// cert `pnpm generate:certificates` mints (apps/web/scripts/generate-certs.mjs),
// shared with web and api through the repo-root .certs/ dir (gitignored: it
// holds a private key). Run that command once first; until then this falls
// back to HTTP.
const certDir = join(import.meta.dirname, '../../.certs')
const certKey = join(certDir, 'dev.pem')
const certFile = join(certDir, 'cert.pem')
const hasCert = existsSync(certKey) && existsSync(certFile)

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  ui: {},
  devServer: hasCert ? { https: { key: certKey, cert: certFile } } : undefined
})
