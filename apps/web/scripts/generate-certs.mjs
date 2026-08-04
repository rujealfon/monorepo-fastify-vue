#!/usr/bin/env node
// Mints the repo-root .certs/ cert without leaving a dev server running.
// vite-plugin-mkcert installs the cert inside Vite's `config` hook, which
// createServer() resolves up front -- before .listen() ever binds a port --
// so we can close the server immediately and never occupy :5173.
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const webRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const certDir = path.resolve(webRoot, '../../.certs')

const server = await createServer({ root: webRoot, logLevel: 'warn' })
await server.close()

if (existsSync(path.join(certDir, 'dev.pem')) && existsSync(path.join(certDir, 'cert.pem'))) {
  // eslint-disable-next-line no-console
  console.log(`Certificates ready at ${certDir}`)
  process.exit(0)
}

console.error('vite-plugin-mkcert did not generate certificates.')
process.exit(1)
