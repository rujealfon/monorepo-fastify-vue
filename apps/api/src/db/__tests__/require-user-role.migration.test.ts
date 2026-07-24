import { readFile } from 'node:fs/promises'

import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { db } from '#api/db/index.js'

const migrationUrl = new URL('../migrations/0014_require-user-role.sql', import.meta.url)
const rollback = new Error('rollback migration fixture')

function fixtureSchema(name: string) {
  return `require_user_role_${name}_${Date.now()}`
}

async function migrationStatements() {
  return (await readFile(migrationUrl, 'utf8'))
    .split('--> statement-breakpoint')
    .map(statement => statement.trim())
    .filter(Boolean)
}

async function createLegacyTables(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  schemaName: string
) {
  await tx.execute(sql.raw(`create schema "${schemaName}"`))
  await tx.execute(sql.raw(`set local search_path to "${schemaName}"`))
  await tx.execute(sql.raw('create table roles (id integer primary key, slug text not null unique)'))
  await tx.execute(sql.raw('create table users (id uuid primary key)'))
  await tx.execute(sql.raw(`
    create table user_roles (
      user_id uuid not null references users(id) on delete cascade,
      role_id integer not null references roles(id) on delete cascade,
      primary key (user_id, role_id)
    )
  `))
}

describe('require-user-role migration', () => {
  it('backfills every roleless user with the Standard User role', async () => {
    const statements = await migrationStatements()
    const schemaName = fixtureSchema('backfill')

    await expect(db.transaction(async (tx) => {
      await createLegacyTables(tx, schemaName)
      await tx.execute(sql.raw(`insert into roles (id, slug) values (3, 'standard-user')`))
      await tx.execute(sql.raw(`
        insert into users (id) values
          ('00000000-0000-4000-8000-000000000001'),
          ('00000000-0000-4000-8000-000000000002')
      `))
      await tx.execute(sql.raw(`
        insert into user_roles (user_id, role_id)
        values ('00000000-0000-4000-8000-000000000002', 3)
      `))

      for (const statement of statements)
        await tx.execute(sql.raw(statement))

      const result = await tx.execute<{ user_id: string, role_id: number }>(sql.raw(`
        select user_id, role_id
        from user_roles
        order by user_id
      `))
      expect(result.rows).toEqual([
        { user_id: '00000000-0000-4000-8000-000000000001', role_id: 3 },
        { user_id: '00000000-0000-4000-8000-000000000002', role_id: 3 }
      ])

      throw rollback
    })).rejects.toBe(rollback)
  })

  it('aborts before changing data when the Standard User role is missing', async () => {
    const [preflight] = await migrationStatements()
    const schemaName = fixtureSchema('preflight')

    await expect(db.transaction(async (tx) => {
      await createLegacyTables(tx, schemaName)
      await tx.execute(sql.raw(`
        insert into users (id)
        values ('00000000-0000-4000-8000-000000000003')
      `))
      await tx.execute(sql.raw(preflight))
    })).rejects.toThrow('Cannot enforce user roles: the Standard User role is missing')
  })
})
