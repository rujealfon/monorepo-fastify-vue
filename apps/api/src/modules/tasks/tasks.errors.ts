import type { PolicyDecision } from '#api/modules/users'

export class TaskNotFoundError extends Error {
  readonly id: number
  readonly statusCode = 404
  readonly decision?: PolicyDecision

  constructor(id: number, decision?: PolicyDecision) {
    super(`Task ${id} not found`)
    this.name = 'TaskNotFoundError'
    this.id = id
    this.decision = decision
  }
}
