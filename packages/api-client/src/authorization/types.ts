import type { paths } from '../schema.js'

type AuthorizationPath = paths['/api/v1/me/authorization']
type RulesPath = paths['/api/v1/ability-rules/']
type RulePath = paths['/api/v1/ability-rules/{ruleId}']
type CatalogPath = paths['/api/v1/authorization/catalog']

export type Authorization = AuthorizationPath['get']['responses'][200]['content']['application/json']
export type EffectiveAbilityRule = Authorization['rules'][number]
export type AbilityAction = EffectiveAbilityRule['action']
export type AbilitySubject = EffectiveAbilityRule['subject']
export type AbilityRule = RulesPath['get']['responses'][200]['content']['application/json'][number]
export type CreateAbilityRule = RulesPath['post']['requestBody']['content']['application/json']
export type UpdateAbilityRule = RulePath['patch']['requestBody']['content']['application/json']
export type AuthorizationCatalog = CatalogPath['get']['responses'][200]['content']['application/json']
