import * as repository from './permissions.repository.js'

export function listPermissions() {
  return repository.findPermissions()
}
