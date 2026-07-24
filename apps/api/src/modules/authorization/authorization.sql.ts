import type { SQL } from 'drizzle-orm'
import type { AppAbility, AppRawRule } from './authorization.ability.js'
import type { AbilityAction, AbilitySubject } from './authorization.catalog.js'

import { and, eq, getTableColumns, gt, gte, inArray, isNotNull, isNull, lt, lte, ne, not, notInArray, or, sql } from 'drizzle-orm'

import { auditLogs } from '#api/modules/audit-logs/audit-logs.schema.js'
import { roles } from '#api/modules/roles/roles.schema.js'
import { tasks } from '#api/modules/tasks/tasks.schema.js'
import { profiles, users } from '#api/modules/users/users.schema.js'

const SUBJECT_COLUMNS = {
  Task: getTableColumns(tasks),
  Profile: getTableColumns(profiles),
  User: getTableColumns(users),
  Role: getTableColumns(roles),
  AuditLog: getTableColumns(auditLogs)
}

function compileField(column: Parameters<typeof eq>[0], value: unknown): SQL {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return eq(column, value)
  const expressions: SQL[] = []
  for (const [operator, operand] of Object.entries(value)) {
    switch (operator) {
      case '$eq':
        expressions.push(eq(column, operand))
        break
      case '$ne':
        expressions.push(ne(column, operand))
        break
      case '$in':
        if (!Array.isArray(operand))
          throw new Error('$in operand must be an array')
        expressions.push(inArray(column, operand))
        break
      case '$nin':
        if (!Array.isArray(operand))
          throw new Error('$nin operand must be an array')
        expressions.push(notInArray(column, operand))
        break
      case '$lt':
        expressions.push(lt(column, operand))
        break
      case '$lte':
        expressions.push(lte(column, operand))
        break
      case '$gt':
        expressions.push(gt(column, operand))
        break
      case '$gte':
        expressions.push(gte(column, operand))
        break
      case '$exists':
        expressions.push(operand === true ? isNotNull(column) : isNull(column))
        break
      default:
        throw new Error(`Unsupported SQL condition operator ${operator}`)
    }
  }
  return and(...expressions) ?? eq(column, null)
}

function compileConditions(subject: Exclude<AbilitySubject, 'all' | 'AbilityRule'>, conditions?: Record<string, unknown>) {
  if (!conditions)
    return undefined
  const columns = SUBJECT_COLUMNS[subject]
  const expressions = Object.entries(conditions).map(([field, value]) => {
    const column = columns[field as keyof typeof columns]
    if (!column)
      throw new Error(`Condition field ${field} has no SQL mapping for ${subject}`)
    return compileField(column, value)
  })
  return and(...expressions)
}

function applies(rule: AppRawRule, action: AbilityAction, subject: AbilitySubject) {
  const actions = Array.isArray(rule.action) ? rule.action : [rule.action]
  const subjects = Array.isArray(rule.subject) ? rule.subject : [rule.subject]
  return (actions.includes(action) || actions.includes('manage'))
    && (subjects.includes(subject) || subjects.includes('all'))
}

export function rulesToDrizzleWhere(
  ability: AppAbility,
  action: AbilityAction,
  subject: Exclude<AbilitySubject, 'all' | 'AbilityRule'>
): SQL {
  const rules = ability.rules.filter(rule => applies(rule, action, subject))
  const allowed: SQL[] = []
  for (let index = 0; index < rules.length; index++) {
    const rule = rules[index]!
    if (rule.inverted)
      continue
    const allow = compileConditions(subject, rule.conditions) ?? sql`true`
    const laterDenies = rules.slice(index + 1)
      .filter(candidate => candidate.inverted)
      .map(candidate => compileConditions(subject, candidate.conditions) ?? sql`true`)
    allowed.push(laterDenies.length ? and(allow, not(or(...laterDenies)!))! : allow)
  }
  return or(...allowed) ?? sql`false`
}
