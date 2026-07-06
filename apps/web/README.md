# @monorepo-fastify-vue/web

Vue 3 + Vite frontend for the tasks app. During development, API requests to `/api` are proxied to the Fastify server running on `http://localhost:3000`.

## Tech Stack

- [Vue 3](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Vue Router](https://router.vuejs.org/) — client-side routing
- [VeeValidate](https://vee-validate.logaretm.com/) + [Zod](https://zod.dev/) — form validation
- [@monorepo-fastify-vue/api-client](../../packages/api-client/) — API client (built for Hono's RPC client; being reworked to consume the Fastify API's OpenAPI spec, see root README)

## Scripts

| Command          | Description                                       |
| ---------------- | ------------------------------------------------- |
| `pnpm dev`       | Start Vite dev server                             |
| `pnpm build`     | Build for production (outputs to `dist/`)          |
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

The build output goes to `apps/web/dist/`.

## Vercel

Create a separate Vercel project with Root Directory set to `apps/web`.

Set `VITE_API_BASE_URL` to the deployed API URL, for example `https://your-api-project.vercel.app`.
