import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import ui from '@nuxt/ui/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Only ever *reads* the leaf cert; minting is `pnpm generate:certificates`
// (apps/web/scripts/generate-certs.mjs), which keeps the CA root out of this
// dir. Nothing here may provision a cert on the fly: vite-plugin-mkcert folds
// every locally-detected network IP into its host list, so in a container --
// whose bridge IP changes on every restart -- it would regenerate on each
// start, and the CA it installs is only trusted inside that ephemeral
// container anyway. The leaf pair is shared with site (apps/site/nuxt.config.ts)
// and api (apps/api/src/app.ts) through the repo-root .certs/ dir (gitignored:
// it holds a private key; repo-relative because docker-compose bind-mounts it,
// and compose does not expand "~"). Falls back to HTTP until the cert exists.
const certDir = path.resolve(import.meta.dirname, '../../.certs')
const certKey = path.join(certDir, 'dev.pem')
const certFile = path.join(certDir, 'cert.pem')
const hasCert = existsSync(certKey) && existsSync(certFile)

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  define: {
    // AuthLayout's Home/About links point at the public site, which doesn't
    // exist in web anymore (moved out — see apps/site). Locally it serves
    // HTTPS once the shared dev cert exists (same hasCert check as this
    // file's own server.https, below) and HTTP otherwise.
    'import.meta.env.VITE_SITE_URL': JSON.stringify(
      process.env.VITE_SITE_URL ?? `${hasCert ? 'https' : 'http'}://localhost:8000`
    )
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
    ui({
      theme: {
        colors: ['primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error']
      },
      ui: {
        colors: {
          primary: 'brand-primary',
          secondary: 'brand-secondary',
          accent: 'brand-accent',
          info: 'brand-info',
          success: 'brand-success',
          warning: 'brand-warning',
          error: 'brand-error',
          neutral: 'slate'
        }
      }
    })
  ],
  server: {
    https: hasCert
      ? { key: readFileSync(certKey), cert: readFileSync(certFile) }
      : undefined,
    proxy: {
      // Development stays same-origin; Vite forwards API calls to the API container.
      // The api dev server serves HTTPS-only once .certs/ exists (mirrors this
      // server's own hasCert check), and its cert doesn't cover docker's
      // internal 'api' hostname (only localhost/127.0.0.1), so verification is
      // skipped for this internal-only hop.
      '/api': {
        target: process.env.API_PROXY_URL ?? (hasCert ? 'https://localhost:3000' : 'http://localhost:3000'),
        changeOrigin: false,
        secure: false
      }
    }
  }
})
