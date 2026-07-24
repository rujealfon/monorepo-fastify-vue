export const ABILITY_ACTIONS = ['manage', 'create', 'read', 'update', 'delete', 'assign'] as const
export const ABILITY_SUBJECTS = ['all', 'Task', 'Profile', 'User', 'Role', 'AbilityRule', 'AuditLog'] as const

export type AbilityAction = typeof ABILITY_ACTIONS[number]
export type AbilitySubject = typeof ABILITY_SUBJECTS[number]

type SubjectCatalogEntry = {
  conditionFields: readonly string[]
  readableFields: readonly string[]
  writableFields: readonly string[]
  identityFields: readonly string[]
}

export const AUTHORIZATION_CATALOG: Record<Exclude<AbilitySubject, 'all' | 'AbilityRule'>, SubjectCatalogEntry> = {
  Task: {
    conditionFields: ['id', 'userId', 'name', 'done', 'createdAt', 'updatedAt'],
    readableFields: ['id', 'userId', 'name', 'done', 'createdAt', 'updatedAt'],
    writableFields: ['name', 'done'],
    identityFields: ['id']
  },
  Profile: {
    conditionFields: ['userId', 'firstName', 'lastName', 'bio', 'gender', 'birthDate'],
    readableFields: ['userId', 'firstName', 'lastName', 'bio', 'gender', 'birthDate'],
    writableFields: ['firstName', 'lastName', 'bio', 'gender', 'birthDate'],
    identityFields: ['userId']
  },
  User: {
    conditionFields: ['id', 'email', 'createdAt', 'updatedAt'],
    readableFields: ['id', 'email', 'createdAt', 'updatedAt', 'roles'],
    writableFields: ['email'],
    identityFields: ['id']
  },
  Role: {
    conditionFields: ['id', 'name', 'slug', 'isSystem', 'isActive'],
    readableFields: ['id', 'name', 'slug', 'description', 'isSystem', 'isActive', 'createdAt', 'updatedAt', 'userCount', 'abilityRules'],
    writableFields: ['name', 'description', 'isActive'],
    identityFields: ['id', 'slug']
  },
  AuditLog: {
    conditionFields: ['id', 'actorId', 'action', 'entityType', 'entityId', 'createdAt'],
    readableFields: ['id', 'actorId', 'actorEmail', 'action', 'entityType', 'entityId', 'metadata', 'ipAddress', 'userAgent', 'requestId', 'createdAt'],
    writableFields: [],
    identityFields: ['id']
  }
}

export const catalogResponse = {
  actions: [...ABILITY_ACTIONS],
  subjects: ABILITY_SUBJECTS.map(subject => ({
    subject,
    ...subject === 'all' || subject === 'AbilityRule'
      ? { conditionFields: [], readableFields: [], writableFields: [], identityFields: [] }
      : {
          conditionFields: [...AUTHORIZATION_CATALOG[subject].conditionFields],
          readableFields: [...AUTHORIZATION_CATALOG[subject].readableFields],
          writableFields: [...AUTHORIZATION_CATALOG[subject].writableFields],
          identityFields: [...AUTHORIZATION_CATALOG[subject].identityFields]
        }
  })),
  operators: ['$eq', '$ne', '$in', '$nin', '$lt', '$lte', '$gt', '$gte', '$exists'],
  actorReferences: ['actor.id', 'actor.email', 'actor.roleSlugs'],
  conditionSchemaVersion: 1
}
