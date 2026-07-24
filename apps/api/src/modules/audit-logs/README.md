# Audit Log

Append-only record of who changed what, when, and from where. Every mutating feature must write to it — this is a project convention, not an option.

## When to record an event

- **Every mutation** a user can trigger: create, update, delete, replace, assign.
- **Security events**: login success/failure, logout, registration, permission-denied attempts.
- Reads are not audited (except the automatic `auth.permission_denied` on failed authorization — already handled globally in `plugins/auth.ts`).

## How to add audit logging to a new feature

### 1. Add the action(s) to `audit-logs.schema.ts`

Extend `AUDIT_ACTIONS` (and `AUDIT_ENTITY_TYPES` if the feature introduces a new entity):

```ts
export const AUDIT_ACTIONS = [
  // ...
  'invoice.created',
  'invoice.voided'
] as const
```

Naming: `<entity>.<past_tense_verb>` — `task.created`, `role.ability_rules_replaced`, `auth.login_failed`. The `action` column is varchar, so **no DB migration is needed** for new actions.

### 2. Call `recordAuditEvent` from the service layer

```ts
import { recordAuditEvent } from '#api/modules/audit-logs'

await recordAuditEvent({
  actorId: userId,            // string | null — null only when no user is known (e.g. failed login for unknown email)
  action: 'invoice.created',
  entityType: 'invoice',
  entityId: invoice.id,       // string | number — stringified automatically
  metadata: { total: invoice.total }
})
```

- IP address, user-agent, and request ID are captured **automatically** via AsyncLocalStorage (`plugins/audit-logs-context.ts`) — never pass them manually.
- Failures propagate on purpose: a mutation whose audit write fails should fail loudly.

### 3. Mutation inside a transaction? Keep the audit row atomic

Repositories that wrap the mutation in `db.transaction` take an optional trailing callback; the service passes the audit call into it (see `roles.repository.ts` / `roles.service.ts`):

```ts
// repository
export function voidInvoice(id: number, audit?: (tx: DbExecutor) => Promise<void>) {
  return db.transaction(async (tx) => {
    // ...mutation...
    if (audit) await audit(tx)
  })
}

// service
await repository.voidInvoice(id, tx => recordAuditEvent({ ... }, tx))
```

Only invoke the callback on the success path — aborted mutations must not log.

Creates are exempt: entity insert and `recordAuditEvent` run as two separate statements, not threaded through a transaction. Accepted tradeoff (see `createRole`/`createTask`/`register`) — an audit-write failure after a successful create surfaces as a 500 with no audit row, rather than rolling back the create.

### 4. Metadata conventions

- Updates: `{ before, after }` limited to the changed fields (see `tasks.service.updateTask`).
- Replacements: previous + new ids (`{ previousRoleIds, roleIds }`).
- **Never** log secrets, password hashes, or tokens. For PII-heavy payloads log field names only (see `profile.updated` → `{ changedFields }`).

### 5. Web

Add a label for each new action to `actionItems` in `apps/web/src/features/audit-logs/views/AuditLogsView.vue`, then regenerate the client so the `AuditAction` union picks it up:

```sh
pnpm api-client:generate && pnpm --filter @monorepo-fastify-vue/api-client build
```

### 6. Tests

- Handler tests that mutate now create audit rows — add `delete from audit_logs` to suite cleanup (FK is `on delete set null`, so `delete from users` does **not** remove them).
- Service tests that mock the repository must also `vi.mock('#api/modules/audit-logs')`, or the real insert hits the database.
- Assert the event in the feature's handler test (action, actor, metadata) — see `audit.handlers.test.ts` for the pattern.

## Guarantees & operational notes

- **Immutable rows**: a `BEFORE UPDATE` trigger (`0011_audit-logs-immutable.sql`) rejects direct updates; only trigger-cascaded updates (the actor FK's `SET NULL` on user deletion) pass. `DELETE` stays allowed for retention pruning.
- **Actor survives deletion**: `actor_id` nulls out when the user is deleted; `actorEmail` in the list response comes from a live join and turns null too.
- **Viewing**: `GET /api/v1/audit-logs/` requires an effective CASL `read AuditLog` ability (seeded for Admin; Super Admin has the immutable `manage all` rule). Web page: `/admin/audit-logs`.
- **Retention**: not implemented yet — login events will dominate volume; prune with plain `DELETE` when a policy lands.
