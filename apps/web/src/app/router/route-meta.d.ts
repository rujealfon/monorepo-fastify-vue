import 'vue-router'

declare module 'vue-router' {

  interface RouteMeta {
    requiresAuth?: boolean
    permissions?: import('@monorepo-fastify-vue/api-client').PermissionKey[]
    permissionMode?: 'all' | 'any'
  }
}
