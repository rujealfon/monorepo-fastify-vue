#!/usr/bin/env node
// Mints the local dev HTTPS cert without leaving a dev server running.
// vite-plugin-mkcert installs the cert inside Vite's `config` hook, which
// createServer() resolves up front -- before .listen() ever binds a port --
// so we can close the server immediately and never occupy :5173.
//
// Two directories are involved, and the split is deliberate:
//
//   ~/.vite-plugin-mkcert/  CA root (rootCA-key.pem signs certs the OS/browser
//                           trusts for ANY host) + the mkcert binary. Never
//                           bind-mounted, never in the repo. Resolved through
//                           os.homedir(), so it works on Windows (%USERPROFILE%)
//                           as well as macOS/Linux -- unlike a literal "~", which
//                           only a POSIX shell expands.
//   <repo>/.certs/          Leaf key + cert only (localhost). This is the dir
//                           docker-compose bind-mounts read-only into app, site
//                           and api, so it must never hold CA material: a
//                           container that could read rootCA-key.pem could mint
//                           certs your browser trusts for any domain.
import { createHash } from 'node:crypto'
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import mkcert from 'vite-plugin-mkcert'

const appRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const certDir = path.resolve(appRoot, '../../.certs')
// Same value as vite-plugin-mkcert's own default (PLUGIN_DATA_DIR), passed
// explicitly so this script and the plugin can't drift apart.
const caDir = path.join(os.homedir(), '.vite-plugin-mkcert')

const KEY_FILE = 'dev.pem'
const CERT_FILE = 'cert.pem'
const CA_KEY_FILE = 'rootCA-key.pem'
const MKCERT_BINARY = process.platform === 'win32' ? 'mkcert.exe' : 'mkcert'
// Everything mkcert keeps in its CAROOT. Earlier versions of this setup pointed
// the plugin's savePath at .certs/, so these may still be sitting in the
// bind-mounted dir on an existing checkout -- relocate rather than delete, so a
// CA already trusted by the developer's browser keeps working.
const CA_FILES = ['rootCA.pem', CA_KEY_FILE, 'config.json', MKCERT_BINARY]
// Re-downloadable / regenerated on demand, so a duplicate can just be dropped.
const DISPOSABLE_CA_FILES = new Set(['config.json', MKCERT_BINARY])

function move(from, to) {
  try {
    renameSync(from, to)
  }
  catch {
    // Home dir and repo can live on different volumes (common on Windows).
    copyFileSync(from, to)
    rmSync(from, { force: true })
  }
}

function sameContent(a, b) {
  const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex')

  return digest(a) === digest(b)
}

function relocateStrayCaMaterial() {
  const stray = CA_FILES.filter(file => existsSync(path.join(certDir, file)))

  if (!stray.length)
    return

  const strayCaKey = path.join(certDir, CA_KEY_FILE)
  const targetCaKey = path.join(caDir, CA_KEY_FILE)

  // A CA private key is installed in the OS/browser trust store and cannot be
  // re-derived, so this never deletes one that isn't already saved elsewhere.
  // Two *different* CAs is a judgement call the developer has to make.
  if (existsSync(strayCaKey) && existsSync(targetCaKey) && !sameContent(strayCaKey, targetCaKey)) {
    console.warn(
      `\nWarning: ${strayCaKey} is a different CA than ${targetCaKey}.\n`
      + 'Leaving it in place -- it is no longer mounted into any container, but it is\n'
      + 'still a CA key sitting in the repo. Certificates from here on are signed by the\n'
      + `CA in ${caDir}. Once you have confirmed nothing depends on the other one,\n`
      + `delete ${certDir}'s rootCA*.pem by hand (and untrust it in your OS keychain).\n`
    )
    return
  }

  mkdirSync(caDir, { recursive: true })

  const moved = []

  for (const file of stray) {
    const source = path.join(certDir, file)
    const target = path.join(caDir, file)

    if (!existsSync(target)) {
      move(source, target)
      moved.push(file)
      continue
    }

    // Byte-identical copy, or a file mkcert can recreate -- safe to drop.
    if (DISPOSABLE_CA_FILES.has(file) || sameContent(source, target)) {
      rmSync(source, { force: true, recursive: true })
      moved.push(file)
    }
  }

  if (moved.length) {
    // eslint-disable-next-line no-console
    console.log(`Cleared CA material out of ${certDir}: ${moved.join(', ')}`)
  }
}

function assertWritableTarget() {
  for (const file of [KEY_FILE, CERT_FILE]) {
    const target = path.join(certDir, file)

    if (existsSync(target) && statSync(target).isDirectory()) {
      console.error(
        `${target} is a directory.\n`
        + 'Docker creates one when it bind-mounts a cert file that does not exist yet.\n'
        + `Remove ${certDir} and run this command again.`
      )
      process.exit(1)
    }
  }
}

assertWritableTarget()
relocateStrayCaMaterial()

// configFile: false keeps this independent of apps/app/vite.config.ts, which
// only ever reads .certs/ and no longer registers the plugin itself.
const server = await createServer({
  configFile: false,
  root: appRoot,
  logLevel: 'warn',
  plugins: [mkcert({ savePath: caDir })]
})
await server.close()

const sourceKey = path.join(caDir, KEY_FILE)
const sourceCert = path.join(caDir, CERT_FILE)

if (!existsSync(sourceKey) || !existsSync(sourceCert)) {
  console.error(`vite-plugin-mkcert did not generate certificates in ${caDir}.`)
  process.exit(1)
}

mkdirSync(certDir, { recursive: true })
copyFileSync(sourceKey, path.join(certDir, KEY_FILE))
copyFileSync(sourceCert, path.join(certDir, CERT_FILE))
chmodSync(path.join(certDir, KEY_FILE), 0o600)
chmodSync(path.join(certDir, CERT_FILE), 0o644)

// eslint-disable-next-line no-console
console.log(`Certificates ready at ${certDir} (CA root stays in ${caDir})`)
