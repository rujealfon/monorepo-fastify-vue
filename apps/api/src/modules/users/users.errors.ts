export class UnauthorizedError extends Error {
  statusCode = 401

  constructor() {
    super('Invalid credentials or session')
  }
}

export class DuplicateEmailError extends Error {
  constructor(options?: ErrorOptions) {
    super('Email already registered', options)
  }
}
