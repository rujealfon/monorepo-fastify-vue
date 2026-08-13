# UI

Vue components shared between `apps/web` (Vite + Vue Router) and `apps/site` (Nuxt).

## Why this works across two frameworks

Components here must not import framework-specific pieces (`NuxtLink`, `useRuntimeConfig`, Nuxt auto-imports, `vue-router` composables). They rely only on `@nuxt/ui` components (`UHeader`, `ULink`, `UButton`, …), which both apps already register globally — Nuxt via the `@nuxt/ui` module, web via `@nuxt/ui/vue-plugin`.

`@nuxt/ui`'s `to`/`href` props already handle cross-framework links: an internal path (`/health`) renders through whichever router is present (`NuxtLink` in site, `RouterLink` in web), and an absolute URL (`https://...`) always renders a plain `<a>`. This lets one component serve links into the other app (e.g. web's `AuthLayout` linking `Home`/`About` to site) without any conditional logic — pass the right href from the consuming app and the component doesn't need to know which app it's in.

Session storage, routing, and notifications stay app-specific. `SessionHeader`
owns the shared signed-in/guest presentation while consumers supply User state,
hrefs, logout execution, and failure notification through props/events.

## Components

- `AppHeader` owns the responsive header structure and theme control.
- `SessionHeader` owns signed-in and guest navigation presentation while
  accepting application-specific hrefs and Session actions.

Run `pnpm --filter @monorepo-fastify-vue/ui test` for component behavior, or
the package `lint` and `typecheck` scripts for static verification.

## No build step

This package ships raw `.vue`/`.ts` source (`main`/`exports` point straight at `src/index.ts`). Each consumer compiles it with its own Vite/Nuxt tooling — Nuxt requires `build.transpile: ['@monorepo-fastify-vue/ui']` (see `apps/site/nuxt.config.ts`) so Nitro's server bundle doesn't try to `require()` an uncompiled `.vue` file.
