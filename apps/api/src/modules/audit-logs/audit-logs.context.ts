import { AsyncLocalStorage } from 'node:async_hooks'

export type AuditRequestContext = {
  ip: string | null
  userAgent: string | null
  requestId: string | null
}

const storage = new AsyncLocalStorage<AuditRequestContext>()

export function getAuditRequestContext() {
  return storage.getStore()
}

export function runWithAuditRequestContext(context: AuditRequestContext, callback: () => void) {
  storage.run(context, callback)
}
