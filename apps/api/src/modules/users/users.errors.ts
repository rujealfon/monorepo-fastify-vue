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

  constructor(message = 'You do not have permission to perform this action') {
    super(message)
  }
}

export class UserNotFoundError extends Error {
  statusCode = 404

  constructor() {
    super('User not found')
  }
}

export class RoleNotFoundError extends Error {
  statusCode = 404

  constructor() {
    super('Role not found')
  }
}

export class PermissionNotFoundError extends Error {
  statusCode = 404

  constructor() {
    super('Permission not found')
  }
}

export class PermissionPolicyValidationError extends Error {
  statusCode = 422
  details: { message: string }[]

  constructor() {
    const message = 'Policy conditions must be valid task expressions; non-task permissions require a null condition'
    super(message)
    this.details = [{ message }]
  }
}

export class RoleConflictError extends Error {
  statusCode = 409

  constructor(message: string) {
    super(message)
  }
}
