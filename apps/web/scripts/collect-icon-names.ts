import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ICON_REFERENCE = /i-lucide-([a-z0-9-]+)/g
const SCANNABLE_EXTENSIONS = ['.vue', '.ts']

function collectFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true, recursive: true })
    .filter(entry => entry.isFile() && SCANNABLE_EXTENSIONS.some(ext => entry.name.endsWith(ext)))
    .map(entry => join(entry.parentPath, entry.name))
}

/**
 * Derives the `icon.clientBundle.icons` list from actual `i-lucide-*` usage
 * across the given source roots, so it can't drift out of sync with the
 * icons pages/layouts/components actually reference (see nuxt.config.ts).
 */
export function collectLucideIconNames(roots: string[]): string[] {
  const names = new Set<string>()

  for (const root of roots) {
    for (const file of collectFiles(root)) {
      const content = readFileSync(file, 'utf-8')
      for (const match of content.matchAll(ICON_REFERENCE))
        names.add(`lucide:${match[1]}`)
    }
  }

  return [...names].sort()
}
