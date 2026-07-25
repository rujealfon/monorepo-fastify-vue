import { readFile } from 'node:fs/promises'

import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { db } from '#api/db/index.js'

const migrationUrl = new URL('../migrations/0012_add-casl-ability-rules.sql', import.meta.url)
const rollback = new Error('rollback migration fixture')

async function migrationStatements() {
  return (await readFile(migrationUrl, 'utf8'))
    .split('--> statement-breakpoint')
    .map(statement => statement.trim())
    .filter(Boolean)
}

describe('casl ability-rules migration', () => {
  it('preserves assignment rights for every role with the legacy capability', async () => {
    const schemaName = `casl_assignment_rights_${Date.now()}`

    await expect(db.transaction(async (tx) => {
      await tx.execute(sql.raw(`create schema "${schemaName}"`))
      await tx.execute(sql.raw(`set local search_path to "${schemaName}"`))
      await tx.execute(sql.raw('create table roles (id integer primary key, slug text not null unique)'))
      await tx.execute(sql.raw('create table users (id uuid primary key, authorization_version integer not null default 1)'))
      await tx.execute(sql.raw('create table permissions (id integer primary key, key text not null unique)'))
      await tx.execute(sql.raw(`
        create table role_permissions (
          role_id integer not null references roles(id),
          permission_id integer not null references permissions(id),
          primary key (role_id, permission_id)
        )
      `))
      await tx.execute(sql.raw(`
        insert into roles (id, slug) values
          (1, 'admin'),
          (2, 'custom-role'),
          (3, 'read-only')
      `))
      await tx.execute(sql.raw(`
        insert into permissions (id, key) values
          (1, 'users.assign_roles'),
          (2, 'users.read')
      `))
      await tx.execute(sql.raw(`
        insert into role_permissions (role_id, permission_id) values
          (1, 1),
          (2, 1),
          (3, 2)
      `))

      for (const statement of await migrationStatements())
        await tx.execute(sql.raw(statement))

      const assignments = await tx.execute<{ slug: string, key: string }>(sql.raw(`
        select r.slug, ar.key
        from role_ability_rules rar
        join roles r on r.id = rar.role_id
        join ability_rules ar on ar.id = rar.ability_rule_id
        where ar.key in ('users.assign_roles', 'roles.assign_standard')
        order by r.slug, ar.key
      `))
      expect(assignments.rows).toEqual([
        { slug: 'admin', key: 'roles.assign_standard' },
        { slug: 'admin', key: 'users.assign_roles' },
        { slug: 'custom-role', key: 'roles.assign_standard' },
        { slug: 'custom-role', key: 'users.assign_roles' }
      ])

      throw rollback
    })).rejects.toBe(rollback)
  })
})
