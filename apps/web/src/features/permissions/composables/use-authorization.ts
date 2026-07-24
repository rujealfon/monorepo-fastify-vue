import type { MongoAbility } from '@casl/ability'
import type { AbilityAction, AbilitySubject } from '@monorepo-fastify-vue/api-client'
import { createMongoAbility, subject as tagSubject } from '@casl/ability'
import { useQuery } from '@pinia/colada'
import { computed } from 'vue'

import { authorizationQuery } from '@/features/permissions/queries'

export type WebAbility = MongoAbility<[AbilityAction, AbilitySubject | object]>

export function useAuthorization() {
  const query = useQuery(authorizationQuery)
  const ability = computed<WebAbility>(() => createMongoAbility<WebAbility>(query.data.value?.rules ?? []))

  return {
    authorization: query.data,
    ability,
    isLoading: query.isLoading,
    can: (action: AbilityAction, subject: AbilitySubject | object, field?: string) => ability.value.can(action, subject, field)
  }
}

export function subject<T extends object>(type: AbilitySubject, record: T) {
  return tagSubject(type, record)
}
