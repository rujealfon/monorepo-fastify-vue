# API client

Typed OpenAPI client shared by the Vue application and future workspace consumers.

The public package exports:

- `createApiClient` and `ApiClient`
- `RpcError`
- generic `ApiErrorSchema`
- `HealthResponse`

Regenerate the OpenAPI document and TypeScript schema from the repository root:

```bash
pnpm api-client:generate
```

The generated contract intentionally contains only the liveness and readiness paths.
