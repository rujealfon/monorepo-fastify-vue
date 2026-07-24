import 'vue-router'

declare module 'vue-router' {

  interface RouteMeta {
    requiresAuth?: boolean
    ability?: {
      action: import('@monorepo-fastify-vue/api-client').AbilityAction
      subject: import('@monorepo-fastify-vue/api-client').AbilitySubject
    }
  }
}
