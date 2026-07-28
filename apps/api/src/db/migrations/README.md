# Migrations

This starter has no migrations yet; `meta/_journal.json` is an empty Drizzle journal so `pnpm db:migrate` remains a valid no-op. Add module-owned tables to the schema composition point, run `pnpm db:generate`, review the generated SQL, and apply it with `pnpm db:migrate`.

Resetting this starter did not create a migration that drops tables from existing databases.
