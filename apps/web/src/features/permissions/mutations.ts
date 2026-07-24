import type { CreateAbilityRule } from '@monorepo-fastify-vue/api-client'
import { useMutation, useQueryCache } from '@pinia/colada'

import { api } from '@/shared/api/client'
import { fail } from '@/shared/api/fail'

import { ABILITY_RULES_KEY, AUTHORIZATION_KEY } from './queries'

export function useAbilityRuleMutations() {
  const cache = useQueryCache()
  const invalidate = () => Promise.all([
    cache.invalidateQueries({ key: ABILITY_RULES_KEY }),
    cache.invalidateQueries({ key: AUTHORIZATION_KEY })
  ])
  return {
    create: useMutation({
      mutation: async (body: CreateAbilityRule) => {
        const { data, error, response } = await api.POST('/api/v1/ability-rules/', { body })
        await fail(response, error)
        return data
      },
      onSettled: invalidate
    }),
    remove: useMutation({
      mutation: async (ruleId: number) => {
        const { error, response } = await api.DELETE('/api/v1/ability-rules/{ruleId}', { params: { path: { ruleId } } })
        await fail(response, error)
      },
      onSettled: invalidate
    })
  }
}
