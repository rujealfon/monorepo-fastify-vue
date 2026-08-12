import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** @param {string} start */
function workspaceRoot(start) {
  let current = start
  while (true) {
    if (existsSync(join(current, 'pnpm-workspace.yaml')))
      return current
    const parent = dirname(current)
    if (parent === current)
      throw new Error(`Could not find pnpm workspace above ${start}`)
    current = parent
  }
}

/** @param {string} start */
export function localDevelopmentTransport(start) {
  const certificateDirectory = join(workspaceRoot(start), '.certs')
  const keyPath = join(certificateDirectory, 'dev.pem')
  const certificatePath = join(certificateDirectory, 'cert.pem')
  const hasCertificate = existsSync(keyPath) && existsSync(certificatePath)
  /** @type {'http' | 'https'} */
  const protocol = hasCertificate ? 'https' : 'http'

  return {
    certificatePath,
    hasCertificate,
    keyPath,
    protocol,
    readHttps() {
      return hasCertificate
        ? { key: readFileSync(keyPath), cert: readFileSync(certificatePath) }
        : undefined
    }
  }
}
