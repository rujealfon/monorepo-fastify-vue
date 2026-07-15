export class InsufficientPermissionError extends Error {
  statusCode = 403

  constructor() {
    super('You do not have permission to perform this action')
  }
}
