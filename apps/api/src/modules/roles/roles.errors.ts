export class RoleNotFoundError extends Error {
  statusCode = 404

  constructor() {
    super('Role not found')
  }
}

export class UnknownRoleError extends Error {
  statusCode = 422

  constructor() {
    super('Unknown role')
  }
}

export class SystemRoleError extends Error {
  statusCode = 403

  constructor() {
    super('System roles cannot be modified')
  }
}

export class RoleAlreadyExistsError extends Error {
  statusCode = 409

  constructor() {
    super('A role with that slug already exists')
  }
}

export class RoleInUseError extends Error {
  statusCode = 409

  constructor() {
    super('Role is assigned to users and cannot be deleted')
  }
}
