import type { AbilityAction, AbilitySubject } from './authorization.catalog.js'
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'

import { z } from 'zod'
import { roles } from '#api/modules/roles/roles.schema.js'

import { users } from '#api/modules/users/users.schema.js'
import { ABILITY_ACTIONS, ABILITY_SUBJECTS, AUTHORIZATION_CATALOG } from './authorization.catalog.js'
import { validateConditions } from './authorization.conditions.js'

export const abilityActionSchema = z.enum(ABILITY_ACTIONS)
export const abilitySubjectSchema = z.enum(ABILITY_SUBJECTS)
export const abilityEffectSchema = z.enum(['allow', 'deny'])
export const conditionDocumentSchema = z.record(z.string(), z.unknown())

export const abilityRules = pgTable('ability_rules', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  key: varchar('key', { length: 150 }).notNull().unique(),
  description: text('description'),
  effect: varchar('effect', { length: 10 }).$type<'allow' | 'deny'>().notNull(),
  action: varchar('action', { length: 20 }).$type<AbilityAction>().notNull(),
  subject: varchar('subject', { length: 50 }).$type<AbilitySubject>().notNull(),
  fields: jsonb('fields').$type<string[]>(),
  actorConditions: jsonb('actor_conditions').$type<Record<string, unknown>>(),
  resourceConditions: jsonb('resource_conditions').$type<Record<string, unknown>>(),
  denialReason: text('denial_reason'),
  priority: integer('priority').notNull().default(0),
  isSystem: boolean('is_system').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  conditionSchemaVersion: integer('condition_schema_version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
})

export const roleAbilityRules = pgTable('role_ability_rules', {
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  abilityRuleId: integer('ability_rule_id').notNull().references(() => abilityRules.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  primaryKey({ columns: [table.roleId, table.abilityRuleId] }),
  index('role_ability_rules_ability_rule_id_idx').on(table.abilityRuleId)
])

const baseRuleInputObjectSchema = z.object({
  key: z.string().trim().min(1).max(150).regex(/^[a-z][a-z0-9_.-]*$/),
  description: z.string().trim().max(500).nullable().optional(),
  effect: abilityEffectSchema,
  action: abilityActionSchema,
  subject: abilitySubjectSchema,
  fields: z.array(z.string().min(1).max(100)).max(100).nullable().optional(),
  actorConditions: conditionDocumentSchema.nullable().optional(),
  resourceConditions: conditionDocumentSchema.nullable().optional(),
  denialReason: z.string().trim().max(500).nullable().optional(),
  priority: z.number().int().min(-1_000_000).max(999_999).default(0),
  isActive: z.boolean().default(true)
})

function validateRuleConditions(rule: {
  subject?: z.infer<typeof abilitySubjectSchema>
  action?: z.infer<typeof abilityActionSchema>
  fields?: string[] | null
  actorConditions?: Record<string, unknown> | null
  resourceConditions?: Record<string, unknown> | null
}, ctx: z.RefinementCtx) {
  if (!rule.subject)
    return
  if (rule.fields?.length) {
    const allowed = new Set(rule.subject === 'all' || rule.subject === 'AbilityRule'
      ? []
      : rule.action === 'read'
        ? AUTHORIZATION_CATALOG[rule.subject].readableFields
        : AUTHORIZATION_CATALOG[rule.subject].writableFields)
    for (const field of rule.fields) {
      if (!allowed.has(field))
        ctx.addIssue({ code: 'custom', path: ['fields'], message: `Field ${field} is not available for ${rule.action ?? 'this action'} ${rule.subject}` })
    }
  }
  for (const [kind, value] of [['actor', rule.actorConditions], ['resource', rule.resourceConditions]] as const) {
    try {
      validateConditions(value, rule.subject ?? 'all', kind)
    }
    catch (error) {
      ctx.addIssue({ code: 'custom', path: [`${kind}Conditions`], message: error instanceof Error ? error.message : 'Invalid conditions' })
    }
  }
}

export const createAbilityRuleSchema = baseRuleInputObjectSchema.superRefine(validateRuleConditions)
export type CreateAbilityRule = z.infer<typeof createAbilityRuleSchema>
export const patchAbilityRuleSchema = baseRuleInputObjectSchema.partial()
  .refine(value => Object.keys(value).length > 0, 'At least one field is required')
  .superRefine(validateRuleConditions)
export type PatchAbilityRule = z.infer<typeof patchAbilityRuleSchema>

export const selectAbilityRuleSchema = createSelectSchema(abilityRules, {
  id: schema => schema.positive(),
  action: abilityActionSchema,
  subject: abilitySubjectSchema,
  effect: abilityEffectSchema,
  fields: z.array(z.string()).nullable(),
  actorConditions: conditionDocumentSchema.nullable(),
  resourceConditions: conditionDocumentSchema.nullable()
})
export type SelectAbilityRule = z.infer<typeof selectAbilityRuleSchema>

export const effectiveAbilityRuleSchema = z.object({
  action: abilityActionSchema,
  subject: abilitySubjectSchema,
  fields: z.array(z.string()).optional(),
  conditions: conditionDocumentSchema.optional(),
  inverted: z.boolean().optional(),
  reason: z.string().optional()
})
export type EffectiveAbilityRule = z.infer<typeof effectiveAbilityRuleSchema>

export const currentAuthorizationSchema = z.object({
  user: z.object({ id: z.uuid(), email: z.string() }),
  roles: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string(),
    slug: z.string()
  })),
  rules: z.array(effectiveAbilityRuleSchema),
  authorizationVersion: z.number().int().positive()
})
export type CurrentAuthorization = z.infer<typeof currentAuthorizationSchema>

export const replaceRoleAbilityRulesSchema = z.object({ abilityRuleIds: z.array(z.number().int().positive()).max(500) })
export type ReplaceRoleAbilityRules = z.infer<typeof replaceRoleAbilityRulesSchema>

export const authorizationCatalogSchema = z.object({
  actions: z.array(abilityActionSchema),
  subjects: z.array(z.object({
    subject: abilitySubjectSchema,
    conditionFields: z.array(z.string()),
    readableFields: z.array(z.string()),
    writableFields: z.array(z.string()),
    identityFields: z.array(z.string())
  })),
  operators: z.array(z.string()),
  actorReferences: z.array(z.string()),
  conditionSchemaVersion: z.number().int()
})
