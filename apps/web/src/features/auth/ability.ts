import type { MongoAbility } from '@casl/ability'
import type { User } from '@monorepo-fastify-vue/api-client'

import { createMongoAbility } from '@casl/ability'
import { useQuery } from '@pinia/colada'
import { computed } from 'vue'

import { sessionQuery } from './queries'

export type AppAbility = MongoAbility<[string, string]>

// The API is the enforcement point; this ability only mirrors the CASL rules
// it returns with the session so the UI can hide what the user cannot do.
export function buildAbility(user: User | null | undefined): AppAbility {
  return createMongoAbility<[string, string]>((user?.permissions ?? []).map(({ action, subject, conditions }) => ({
    action,
    subject,
    ...(conditions ? { conditions } : {})
  })))
}

export function useAppAbility() {
  const session = useQuery(sessionQuery)
  return computed(() => buildAbility(session.data.value))
}
