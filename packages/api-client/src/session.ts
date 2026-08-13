import type { ApiClient } from './client.js'
import type { LoginUser, RegisterUser, UpdateProfile, User } from './users/types.js'

import { expectData, expectEmpty, expectOptional } from './errors.js'

export function createSessionClient(client: ApiClient) {
  return {
    async currentUser(): Promise<User | null> {
      return expectOptional(() => client.GET('/api/v1/profile/'), [401, 403])
    },

    async register(body: RegisterUser): Promise<void> {
      return expectEmpty(() => client.POST('/api/v1/auth/register', { body }))
    },

    async login(body: LoginUser): Promise<User> {
      return expectData(() => client.POST('/api/v1/auth/login', { body }))
    },

    async logout(): Promise<void> {
      return expectEmpty(() => client.POST('/api/v1/auth/logout'))
    },

    async updateProfile(body: UpdateProfile): Promise<User> {
      return expectData(() => client.PATCH('/api/v1/profile/', { body }))
    }
  }
}

export type SessionClient = ReturnType<typeof createSessionClient>
