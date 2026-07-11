export class TaskNotFoundError extends Error {
  readonly id: number
  readonly statusCode = 404

  constructor(id: number) {
    super(`Task ${id} not found`)
    this.name = 'TaskNotFoundError'
    this.id = id
  }
}
