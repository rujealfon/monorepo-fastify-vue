export class RoleNotFoundError extends Error {
  statusCode = 404

  constructor() {
    super('Role not found')
  }
}

export class RoleSlugTakenError extends Error {
  statusCode = 409

  constructor() {
    super('A role with that slug already exists')
  }
}

export class SystemRoleProtectedError extends Error {
  statusCode = 403

  constructor(message = 'System roles cannot be deleted') {
    super(message)
  }
}

export class UnknownRoleIdsError extends Error {
  statusCode = 400

  constructor() {
    super('One or more role ids do not exist')
  }
}

export class AbilityEscalationError extends Error {
  statusCode = 403

  constructor() {
    super('You cannot assign a role outside your effective ability')
  }
}

export class SuperAdminAssignmentError extends Error {
  statusCode = 403

  constructor() {
    super('Only a super admin can grant or revoke the super admin role')
  }
}

export class LastSuperAdminError extends Error {
  statusCode = 409

  constructor() {
    super('The last super admin cannot be removed')
  }
}

export class AtLeastOneRoleRequiredError extends Error {
  statusCode = 400

  constructor() {
    super('Every user must have at least one role')
  }
}

export class SoleAssignedRoleError extends Error {
  statusCode = 409

  constructor() {
    super('This role cannot be deleted because it is the only role assigned to one or more users')
  }
}

export class TargetUserNotFoundError extends Error {
  statusCode = 404

  constructor() {
    super('User not found')
  }
}
