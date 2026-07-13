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

  constructor(message = 'Insufficient permissions') {
    super(message)
  }
}

export class UserNotFoundError extends Error {
  statusCode = 404

  constructor() {
    super('User not found')
  }
}

export class SuperAdminSeedConflictError extends Error {
  constructor(email: string) {
    super(`Refusing to promote existing non-super-admin account ${email} during super admin seeding`)
  }
}
