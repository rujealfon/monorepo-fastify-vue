import { useQuery } from '@pinia/colada'
import { computed } from 'vue'

import { can, createAbility } from '@/features/permissions/permissions.utils'
import { authorizationQuery } from '@/features/permissions/queries'

export function useAuthorization() {
  const query = useQuery(authorizationQuery)
  const ability = computed(() => createAbility(query.data.value))

  return {
    authorization: query.data,
    ability,
    isLoading: query.isLoading,
    can: (action: string, subject: string, resource?: Record<string, unknown>) => can(ability.value, action, subject, resource)
  }
}
