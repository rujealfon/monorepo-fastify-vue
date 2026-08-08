# Nuxt Site

Nuxt 4 public site for the monorepo. It uses Vue 3 and Nuxt UI and is generated as static files for deployment.

## Development

Install dependencies from the repository root:

```sh
pnpm install
```

Run the site by itself on port 8000:

```sh
pnpm --filter @monorepo-fastify-vue/site dev -- --port 8000
```

Visit [http://localhost:8000](http://localhost:8000). To start every workspace together without conflicting with the API on port 3000, run this from the repository root:

```sh
NITRO_PORT=8000 pnpm dev
```

With Docker, the site is always available at [http://localhost:8000](http://localhost:8000).

## Project Structure

```text
apps/site/
├── app/
│   ├── app.vue           # Nuxt application root
│   ├── layouts/          # App shells (default.vue)
│   └── pages/            # File-based routes (index.vue, about.vue)
├── public/               # Files copied to the site root unchanged
├── nuxt.config.ts        # Nuxt and module configuration (webUrl runtime config)
├── Dockerfile            # Development and static-production images
└── vercel.json           # Static Vercel build settings
```

The site hosts only public pages — Home and About. Its `default` layout's Login and Register buttons link out to the web app (`runtimeConfig.public.webUrl`, set via `NUXT_PUBLIC_WEB_URL`) rather than to internal routes, since authenticated routes live in `apps/web`. Follow Nuxt conventions as the site grows: add file-based routes under `app/pages`, layouts under `app/layouts`, and site-owned components and composables under their corresponding `app` directories.

## Scripts

Run scripts from the repository root with `pnpm --filter @monorepo-fastify-vue/site <script>`.

| Script     | Description                                  |
| ---------- | -------------------------------------------- |
| `dev`      | Start the Nuxt development server            |
| `build`    | Generate the static site in `.output/public` |
| `preview`  | Preview the generated build locally          |
| `lint`     | Check the site with ESLint                   |
| `lint:fix` | Apply safe ESLint fixes                      |

## Deployment

For Vercel, create a project with `apps/site` as its Root Directory. The checked-in `vercel.json` runs `pnpm build` and publishes `.output/public`.

To build the production Docker image from the repository root:

```sh
docker build -f apps/site/Dockerfile --target production -t monorepo-fastify-vue-site .
```

The production image serves the generated static files with nginx on container port 80.
