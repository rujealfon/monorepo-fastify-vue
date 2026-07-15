import { asc, inArray } from 'drizzle-orm'

import { db } from '#api/db/index.js'

import { permissions } from './permissions.schema.js'

export function findPermissions() {
  return db.select().from(permissions).orderBy(asc(permissions.resource), asc(permissions.action))
}

export function findPermissionsByIds(ids: number[]) {
  if (ids.length === 0)
    return Promise.resolve([])
  return db.select().from(permissions).where(inArray(permissions.id, ids))
}
