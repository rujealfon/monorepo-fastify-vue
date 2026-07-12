import { eq, sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { db } from '#api/db/index.js'
import * as repository from '#api/modules/users/users.repository.js'
import { users } from '#api/modules/users/users.schema.js'

describe('users repository', () => {
  it('rolls back the user when profile creation fails', async () => {
    await db.execute(sql`
      create or replace function reject_rollback_profile() returns trigger as $$
      begin
        if exists (select 1 from users where id = new.user_id and email = 'rollback@example.com') then
          raise exception 'forced profile failure';
        end if;
        return new;
      end;
      $$ language plpgsql
    `)
    await db.execute(sql`
      create trigger reject_rollback_profile_trigger
      before insert on profiles
      for each row execute function reject_rollback_profile()
    `)

    try {
      await expect(repository.insert({ email: 'rollback@example.com', passwordHash: 'hash' })).rejects.toThrow()
      const rows = await db.select().from(users).where(eq(users.email, 'rollback@example.com'))
      expect(rows).toHaveLength(0)
    }
    finally {
      await db.execute(sql`drop trigger reject_rollback_profile_trigger on profiles`)
      await db.execute(sql`drop function reject_rollback_profile()`)
    }
  })
})
