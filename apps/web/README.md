# @monorepo-fastify-vue/web

Vue 3 + Vite frontend for the tasks app. During development, API requests to `/api` are proxied to the Fastify server running on `http://localhost:3000`.

## Tech Stack

- [Vue 3](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Vue Router](https://router.vuejs.org/) — client-side routing
- [VeeValidate](https://vee-validate.logaretm.com/) + [Zod](https://zod.dev/) — form validation
- [@monorepo-fastify-vue/api-client](../../packages/api-client/) — API client generated from the Fastify OpenAPI spec

## Scripts

| Command          | Description                                       |
| ---------------- | ------------------------------------------------- |
| `pnpm dev`       | Start Vite dev server                             |
| `pnpm build`     | Build for production                               |
| `pnpm lint`      | Lint with ESLint                                  |
| `pnpm typecheck` | Type-check with `vue-tsc`                         |

## Development

Start from the repo root:

```sh
pnpm dev
```

The web app is available at [http://localhost:5173](http://localhost:5173). All `/api` requests are proxied to the API server at `http://localhost:3000`.

## Production Build

```sh
pnpm build
```

The build output goes to the repository root `dist/` for the one-project Vercel deploy.

## Vercel

Default deployment uses one Vercel project from the repository root. Do not set this package as the Vercel root directory for the default setup.

No `VITE_API_BASE_URL` is needed for the one-project deployment because the frontend calls same-origin `/api/*`.

Separate web deployment is possible with Root Directory set to `apps/web`, but it needs `VITE_API_BASE_URL` and the build output must be `apps/web/dist`. See the root README before switching to that mode.
