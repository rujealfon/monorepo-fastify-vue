/**
 * Guards a mutable read against being overwritten by a slower, now-stale request.
 * Call `start()` before issuing a read, capture its token, and only apply the
 * read's result if `isCurrent(token)` still holds when it resolves. Call
 * `invalidate()` before an identity-changing write so any in-flight read loses
 * the race even if it resolves afterward.
 */
export function createStaleGuard() {
  let generation = 0

  return {
    start(): number {
      return ++generation
    },
    isCurrent(token: number): boolean {
      return token === generation
    },
    invalidate(): void {
      generation++
    }
  }
}

export type StaleGuard = ReturnType<typeof createStaleGuard>
