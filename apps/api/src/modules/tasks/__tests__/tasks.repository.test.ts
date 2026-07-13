import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db } from '#api/db/index.js'
import { roles } from '#api/modules/roles/roles.schema.js'
import * as tasksRepository from '#api/modules/tasks/tasks.repository.js'
import { users } from '#api/modules/users/users.schema.js'

describe('tasks.repository', () => {
  let userId: string
  let otherUserId: string

  beforeAll(async () => {
    await db.execute(sql`truncate table tasks restart identity cascade`)
    await db.execute(sql`truncate table users cascade`)

    const [{ id: roleId }] = await db.select().from(roles).where(eq(roles.slug, 'user'))
    const [user, otherUser] = await db.insert(users).values([
      { email: 'tasks-repo-owner@example.com', passwordHash: 'hash', roleId },
      { email: 'tasks-repo-other@example.com', passwordHash: 'hash', roleId }
    ]).returning()
    userId = user.id
    otherUserId = otherUser.id
  })

  afterAll(async () => {
    await db.execute(sql`truncate table tasks restart identity cascade`)
    await db.execute(sql`truncate table users cascade`)
    await db.$client.end()
  })

  it('inserts and finds a task', async () => {
    const inserted = await tasksRepository.insertOne(userId, { name: 'write tests', done: false })
    expect(inserted.name).toBe('write tests')

    const found = await tasksRepository.findById(userId, inserted.id)
    expect(found?.id).toBe(inserted.id)
  })

  it('lists only the requesting user\'s tasks', async () => {
    await tasksRepository.insertOne(userId, { name: 'second task', done: false })
    await tasksRepository.insertOne(otherUserId, { name: 'someone else\'s task', done: false })

    const { data, total } = await tasksRepository.findMany(userId, 1, 10)
    expect(data.every(task => task.userId === userId)).toBe(true)
    expect(total).toBeGreaterThanOrEqual(2)
  })

  it('updates a task', async () => {
    const inserted = await tasksRepository.insertOne(userId, { name: 'to update', done: false })
    const updated = await tasksRepository.updateById(userId, inserted.id, { done: true })
    expect(updated?.done).toBe(true)
  })

  it('deletes a task', async () => {
    const inserted = await tasksRepository.insertOne(userId, { name: 'to delete', done: false })
    const deleted = await tasksRepository.deleteById(userId, inserted.id)
    expect(deleted?.id).toBe(inserted.id)

    const found = await tasksRepository.findById(userId, inserted.id)
    expect(found).toBeUndefined()
  })

  it('does not find, update, or delete another user\'s task', async () => {
    const inserted = await tasksRepository.insertOne(userId, { name: 'owned by userId', done: false })

    expect(await tasksRepository.findById(otherUserId, inserted.id)).toBeUndefined()
    expect(await tasksRepository.updateById(otherUserId, inserted.id, { done: true })).toBeUndefined()
    expect(await tasksRepository.deleteById(otherUserId, inserted.id)).toBeUndefined()

    const stillThere = await tasksRepository.findById(userId, inserted.id)
    expect(stillThere?.done).toBe(false)
  })
})
