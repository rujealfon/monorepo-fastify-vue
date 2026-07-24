export class InsufficientAbilityError extends Error {
  statusCode = 403

  constructor() {
    super('You do not have permission to perform this action')
  }
}

export class AbilityRuleNotFoundError extends Error {
  statusCode = 404

  constructor() {
    super('Ability rule not found')
  }
}

export class AbilityRuleKeyTakenError extends Error {
  statusCode = 409

  constructor() {
    super('An ability rule with that key already exists')
  }
}

export class SystemAbilityRuleProtectedError extends Error {
  statusCode = 403

  constructor(message = 'System ability rules are protected') {
    super(message)
  }
}

export class UnknownAbilityRuleIdsError extends Error {
  statusCode = 400

  constructor() {
    super('One or more ability rule IDs are unknown')
  }
}
