import type { ApiClient } from './client.js'
import type { LoginUser, RegisterUser, UpdateProfile, User } from './users/types.js'

import { RpcError, rpcRequest } from './errors.js'

function failed(response: Response, error?: ConstructorParameters<typeof RpcError>[1]) {
  return new RpcError(response.status, error)
}

export function createSessionClient(client: ApiClient) {
  return {
    async currentUser(): Promise<User | null> {
      const { data, error, response } = await rpcRequest(() => client.GET('/api/v1/profile/'))
      if (response.status === 401 || response.status === 403)
        return null
      if (!response.ok || !data)
        throw failed(response, error)
      return data
    },

    async register(body: RegisterUser): Promise<void> {
      const { error, response } = await rpcRequest(() => client.POST('/api/v1/auth/register', { body }))
      if (!response.ok)
        throw failed(response, error)
    },

    async login(body: LoginUser): Promise<User> {
      const { data, error, response } = await rpcRequest(() => client.POST('/api/v1/auth/login', { body }))
      if (!response.ok || !data)
        throw failed(response, error)
      return data
    },

    async logout(): Promise<void> {
      const { error, response } = await rpcRequest(() => client.POST('/api/v1/auth/logout'))
      if (!response.ok)
        throw failed(response, error)
    },

    async updateProfile(body: UpdateProfile): Promise<User> {
      const { data, error, response } = await rpcRequest(() => client.PATCH('/api/v1/profile/', { body }))
      if (!response.ok || !data)
        throw failed(response, error)
      return data
    }
  }
}

export type SessionClient = ReturnType<typeof createSessionClient>
