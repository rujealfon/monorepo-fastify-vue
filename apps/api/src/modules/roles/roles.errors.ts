export class RoleNotFoundError extends Error {
  statusCode = 404

  constructor() {
    super('Role not found')
  }
}

export class RoleNameTakenError extends Error {
  statusCode = 409

  constructor() {
    super('A role with that name already exists')
  }
}

export class RoleInUseError extends Error {
  statusCode = 409

  constructor() {
    super('Role is assigned to users and cannot be deleted')
  }
}

export class SystemRoleImmutableError extends Error {
  statusCode = 403

  constructor(message = 'System roles cannot be modified this way') {
    super(message)
  }
}
