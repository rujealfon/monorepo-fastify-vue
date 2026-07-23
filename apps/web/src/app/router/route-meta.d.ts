import 'vue-router'

declare module 'vue-router' {

  interface RouteMeta {
    requiresAuth?: boolean
    ability?: { action: string, subject: string }
  }
}
