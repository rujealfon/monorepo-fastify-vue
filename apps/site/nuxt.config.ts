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
  css: ['~/assets/css/main.css'],
  ui: {},
  devServer: hasCert ? { https: { key: certKey, cert: certFile } } : undefined,
  // @monorepo-fastify-vue/ui ships raw .vue/.ts source (no build step) so both
  // web and site compile it with their own Vue tooling. Without this, Nitro's
  // server bundle would leave the workspace package external and try to
  // `require()` an uncompiled .vue file at runtime.
  build: { transpile: ['@monorepo-fastify-vue/ui'] },
  runtimeConfig: {
    public: {
      // Login/Register live on web, not site — baked in at build time since
      // `nuxt generate` produces static output with no server to read env
      // vars per-request. Set NUXT_PUBLIC_WEB_URL to web's deployed origin
      // (e.g. https://app.example.com) in the site's Vercel project. Locally,
      // web serves HTTPS once the shared dev cert exists (same hasCert check
      // as this file's own devServer, above) and HTTP otherwise.
      webUrl: process.env.NUXT_PUBLIC_WEB_URL ?? `${hasCert ? 'https' : 'http'}://localhost:5173`
    }
  }
})
