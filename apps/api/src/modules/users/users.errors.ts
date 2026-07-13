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

export class ForbiddenError extends Error {
  statusCode = 403

  constructor() {
    super('You are not allowed to perform this action')
  }
}

export class UserNotFoundError extends Error {
  statusCode = 404

  constructor() {
    super('User not found')
  }
}
