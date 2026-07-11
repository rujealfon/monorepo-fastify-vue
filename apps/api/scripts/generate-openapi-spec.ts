import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { buildApp } from '../src/app.js'

const app = buildApp()
await app.ready()

const outPath = fileURLToPath(new URL('../openapi.json', import.meta.url))
writeFileSync(outPath, `${JSON.stringify(app.swagger(), null, 2)}\n`)

await app.close()
