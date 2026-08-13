import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { localDevelopmentTransport } from './index.js'

async function workspace() {
  const root = await mkdtemp(join(tmpdir(), 'dev-transport-'))
  const app = join(root, 'apps', 'web')
  await mkdir(app, { recursive: true })
  await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages: []\n')
  return { app, root }
}

test('uses HTTP until both certificate files exist', async () => {
  const fixture = await workspace()
  const transport = localDevelopmentTransport(fixture.app)

  assert.equal(transport.hasCertificate, false)
  assert.equal(transport.protocol, 'http')
  assert.equal(transport.readHttps(), undefined)
})

test('throws when no pnpm workspace is found above start', async () => {
  const outside = await mkdtemp(join(tmpdir(), 'dev-transport-outside-'))
  assert.throws(() => localDevelopmentTransport(outside), /Could not find pnpm workspace above/)
})

test('discovers and reads the workspace certificate pair', async () => {
  const fixture = await workspace()
  const certificates = join(fixture.root, '.certs')
  await mkdir(certificates)
  await writeFile(join(certificates, 'dev.pem'), 'private-key')
  await writeFile(join(certificates, 'cert.pem'), 'certificate')

  const transport = localDevelopmentTransport(fixture.app)
  assert.equal(transport.hasCertificate, true)
  assert.equal(transport.protocol, 'https')
  assert.equal(transport.readHttps()?.key.toString(), 'private-key')
  assert.equal(transport.readHttps()?.cert.toString(), 'certificate')
})
