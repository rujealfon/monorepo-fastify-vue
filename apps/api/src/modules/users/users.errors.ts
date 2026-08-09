export class UnauthorizedError extends Error {
  statusCode = 401

  constructor() {
    super('Invalid credentials or session')
  }
}
