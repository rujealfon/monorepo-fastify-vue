import type { AppAbility, AppRawRule } from '#api/modules/authorization'

import { createMongoAbility } from '@casl/ability'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db } from '#api/db/index.js'
import { subject } from '#api/modules/authorization'
import * as tasksRepository from '#api/modules/tasks/tasks.repository.js'
import { createTestUsers } from '#api/test/user.fixtures.js'

function ability(rules: AppRawRule[]) {
  return createMongoAbility<AppAbility>(rules)
}

describe('tasks.repository', () => {
  let userId: string
  let otherUserId: string

  beforeAll(async () => {
    await db.execute(sql`truncate table tasks restart identity cascade`)
    await db.execute(sql`delete from users`)

    const [user, otherUser] = await createTestUsers([
      'tasks-repo-owner@example.com',
      'tasks-repo-other@example.com'
    ])
    userId = user.id
    otherUserId = otherUser.id
  })

  afterAll(async () => {
    await db.execute(sql`truncate table tasks restart identity cascade`)
    await db.execute(sql`delete from users`)
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

  it('keeps rows under field-scoped denies while preserving object-wide denies', async () => {
    const visible = await tasksRepository.insertOne(userId, { name: 'visible with redaction', done: false })
    const denied = await tasksRepository.insertOne(userId, { name: 'object denied', done: true })
    const fieldScopedRead = ability([
      { action: 'read', subject: 'Task' },
      { action: 'read', subject: 'Task', fields: ['name'], inverted: true }
    ])

    const fieldScopedResult = await tasksRepository.findMany(fieldScopedRead, 1, 100)
    expect(fieldScopedResult.data.map(task => task.id)).toEqual(expect.arrayContaining([visible.id, denied.id]))
    expect(fieldScopedRead.can('read', subject('Task', visible), 'name')).toBe(false)
    expect(fieldScopedRead.can('read', subject('Task', visible), 'done')).toBe(true)

    const objectWideRead = ability([
      { action: 'read', subject: 'Task' },
      { action: 'read', subject: 'Task', conditions: { done: true }, inverted: true }
    ])
    const objectWideResult = await tasksRepository.findMany(objectWideRead, 1, 100)
    expect(objectWideResult.data.some(task => task.id === visible.id)).toBe(true)
    expect(objectWideResult.data.some(task => task.id === denied.id)).toBe(false)

    const fieldScopedUpdate = ability([
      { action: 'update', subject: 'Task' },
      { action: 'update', subject: 'Task', fields: ['name'], inverted: true }
    ])
    expect(fieldScopedUpdate.can('update', subject('Task', visible), 'name')).toBe(false)
    expect(fieldScopedUpdate.can('update', subject('Task', visible), 'done')).toBe(true)
    await expect(tasksRepository.updateById(fieldScopedUpdate, visible.id, { done: true })).resolves.toMatchObject({
      id: visible.id,
      done: true
    })
  })
})
