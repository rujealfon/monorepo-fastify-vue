export class EmailAlreadyExistsError extends Error {
  statusCode = 409

  constructor() {
    super('An account with that email already exists')
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401

  constructor() {
    super('Invalid credentials or session')
  }
}
