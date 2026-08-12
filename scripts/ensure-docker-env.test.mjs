import assert from 'node:assert/strict'
import { chmod, mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const script = resolve('scripts/ensure-docker-env.sh')
const exampleSecret = 'example-secret-that-is-at-least-32-characters'

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'docker-env-test-'))
  const api = join(root, 'apps/api')
  await mkdir(api, { recursive: true })
  await writeFile(join(api, '.env.example'), `DATABASE_URL=postgresql://app:example@localhost:5432/example\nJWT_SECRET=${exampleSecret}\n`)
  await writeFile(join(api, '.env.test.example'), `DATABASE_URL=postgresql://app:example@localhost:5432/example_test\nJWT_SECRET=${exampleSecret}\n`)

  const openssl = join(root, 'fake-openssl.sh')
  await writeFile(openssl, '#!/usr/bin/env bash\nif [[ "$*" == "rand -hex 24" ]]; then printf "generated-password"; else printf "generated-jwt-secret-that-is-at-least-32-characters"; fi\n')
  await chmod(openssl, 0o700)
  return { api, openssl, root }
}

function run({ openssl, root }, environment = {}) {
  return spawnSync('bash', [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      MONOREPO_DOCKER_ENV_ROOT: root,
      MONOREPO_OPENSSL_BIN: openssl,
      ...environment
    }
  })
}

test('creates private synchronized development and test environments', async () => {
  const files = await fixture()
  const result = run(files, { POSTGRES_DB: 'starter' })
  assert.equal(result.status, 0, result.stderr)

  assert.match(await readFile(join(files.root, '.env'), 'utf8'), /POSTGRES_DB=starter/)
  assert.match(await readFile(join(files.api, '.env'), 'utf8'), /DATABASE_URL=postgresql:\/\/app:generated-password@localhost:5433\/starter/)
  assert.match(await readFile(join(files.api, '.env.test'), 'utf8'), /DATABASE_URL=postgresql:\/\/app:generated-password@localhost:5433\/starter_test/)
  assert.match(await readFile(join(files.api, '.env'), 'utf8'), /JWT_SECRET=generated-jwt-secret/)
  assert.equal((await stat(join(files.root, '.env'))).mode & 0o777, 0o600)
})

test('preserves custom database URLs and private secrets', async () => {
  const files = await fixture()
  await writeFile(join(files.root, '.env'), 'POSTGRES_USER=app\nPOSTGRES_PASSWORD=password\nPOSTGRES_DB=starter\n')
  const custom = 'DATABASE_URL=postgresql://custom.example/custom\nJWT_SECRET=a-private-secret-that-is-at-least-32-characters\n'
  await writeFile(join(files.api, '.env'), custom)
  await writeFile(join(files.api, '.env.test'), custom)

  const result = run(files)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(await readFile(join(files.api, '.env'), 'utf8'), custom)
  assert.equal(await readFile(join(files.api, '.env.test'), 'utf8'), custom)
})

test('rejects an invalid database name before writing it', async () => {
  const files = await fixture()
  const result = run(files, { POSTGRES_DB: 'invalid-name' })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Invalid POSTGRES_DB/)
  assert.doesNotMatch(await readFile(join(files.root, '.env'), 'utf8'), /POSTGRES_DB=/)
})
