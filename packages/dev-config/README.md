# Development Configuration

Shared build-time development configuration for the monorepo.

This package currently owns local HTTPS discovery so the API, web application,
and Nuxt site agree on:

- The workspace certificate location (`.certs/dev.pem` and `.certs/cert.pem`).
- Whether local services use HTTP or HTTPS.
- The certificate paths or buffers required by each framework.

Certificate provisioning remains in the repository scripts. This package only
reads existing files and never creates certificates, modifies trust stores, or
writes configuration.

## Usage

```ts
import { localDevelopmentTransport } from '@monorepo-fastify-vue/dev-config'

const transport = localDevelopmentTransport(import.meta.dirname)

transport.protocol // 'http' or 'https'
transport.hasCertificate
transport.keyPath
transport.certificatePath
transport.readHttps() // { key: Buffer, cert: Buffer } | undefined
```

`localDevelopmentTransport()` walks upward from the supplied directory until
it finds `pnpm-workspace.yaml`, then resolves the certificate pair from the
workspace-root `.certs` directory. HTTP is selected unless both files exist.

## Consumers

- `apps/api/src/app.ts` reads certificate buffers for Fastify.
- `apps/web/vite.config.ts` reads certificate buffers and selects local URLs.
- `apps/site/nuxt.config.ts` uses certificate paths and selects local URLs.

Keep runtime-specific configuration in those consumers. Add shared behavior
here only when at least two applications need the same development policy.

## Certificate provisioning

Generate the local certificate pair with:

```sh
pnpm generate:certificates
```

Docker preparation calls `scripts/ensure-dev-certs.sh`, which provisions the
same files before Compose creates its read-only certificate mounts.

## Verification

```sh
pnpm --filter @monorepo-fastify-vue/dev-config typecheck
pnpm --filter @monorepo-fastify-vue/dev-config test
```

Tests use isolated temporary workspaces and cover both HTTP fallback and HTTPS
certificate discovery.
