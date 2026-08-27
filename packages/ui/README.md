# UI

Vue components shared between `apps/app` (Vite + Vue Router) and `apps/web` (Nuxt).

## Why this works across two frameworks

Components here must not import framework-specific pieces (`NuxtLink`, `useRuntimeConfig`, Nuxt auto-imports, `vue-router` composables). They rely only on `@nuxt/ui` components (`UHeader`, `ULink`, `UButton`, …), which both apps already register globally — Nuxt via the `@nuxt/ui` module, app via `@nuxt/ui/vue-plugin`.

`@nuxt/ui`'s `to`/`href` props already handle cross-framework links: an internal path (`/health`) renders through whichever router is present (`NuxtLink` in web, `RouterLink` in app), and an absolute URL (`https://...`) always renders a plain `<a>`. This lets one component serve links into the other app (e.g. app's `AuthLayout` linking `Home`/`About` to web) without any conditional logic — pass the right href from the consuming app and the component doesn't need to know which app it's in.

App-specific behavior (auth state, a profile dropdown, sign-out) stays out of this package — it's supplied by the consuming layout through props/slots.

## No build step

This package ships raw `.vue`/`.ts` source (`main`/`exports` point straight at `src/index.ts`). Each consumer compiles it with its own Vite/Nuxt tooling — Nuxt requires `build.transpile: ['@monorepo-fastify-vue/ui']` (see `apps/web/nuxt.config.ts`) so Nitro's server bundle doesn't try to `require()` an uncompiled `.vue` file.
