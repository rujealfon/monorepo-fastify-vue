import type { SessionIdentity } from './sessions.types.js'

import { UnauthorizedError } from '#api/modules/users'

import { SESSION_SECONDS } from './sessions.constants.js'
import * as repository from './sessions.repository.js'

export function issue(userId: string, now = new Date()) {
  return repository.insert(userId, new Date(now.getTime() + SESSION_SECONDS * 1000), now)
}

export async function authenticate(identity: SessionIdentity, now = new Date()) {
  if (!await repository.findActive(identity, now))
    throw new UnauthorizedError()
}

export function revoke(identity: SessionIdentity) {
  return repository.remove(identity)
}
