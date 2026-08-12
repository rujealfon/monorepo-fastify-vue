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

The development server uses HTTPS when the shared development certificate is
available and otherwise falls back to HTTP. Open the protocol Nuxt prints for
port 8000. To start every workspace together without conflicting with the API
on port 3000, run this from the repository root:

```sh
NITRO_PORT=8000 pnpm dev
```

Docker Compose provisions the shared certificate, so its development site is
normally available at `https://localhost:8000`.

## Project Structure

```text
apps/site/
├── app/
│   ├── app.vue           # Nuxt application root
│   ├── composables/      # Session state adapter (use-session.ts)
│   ├── layouts/          # App shells (default.vue)
│   └── pages/            # File-based routes (index.vue, about.vue)
├── public/               # Files copied to the site root unchanged
├── nuxt.config.ts        # Nuxt, runtime URLs, and shared local HTTPS policy
├── Dockerfile            # Development and static-production images
└── vercel.json           # Static Vercel build settings
```

The site hosts only public pages — Home and About. Its `default` layout renders
the shared `SessionHeader`: Login and Register link to the web app through
`runtimeConfig.public.webUrl`, while the site-owned `useSession` composable
provides current-User and logout behavior through `runtimeConfig.public.apiUrl`.
Follow Nuxt conventions as the site grows: add file-based routes under
`app/pages`, layouts under `app/layouts`, and site-owned components and
composables under their corresponding `app` directories.

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
