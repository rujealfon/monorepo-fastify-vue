import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db } from '#api/db/index.js'
import * as tasksRepository from '#api/modules/tasks/tasks.repository.js'

describe('tasks.repository', () => {
  beforeAll(async () => {
    await db.execute(sql`truncate table tasks restart identity cascade`)
  })

  afterAll(async () => {
    await db.execute(sql`truncate table tasks restart identity cascade`)
    await db.$client.end()
  })

  it('inserts and finds a task', async () => {
    const inserted = await tasksRepository.insertOne({ name: 'write tests', done: false })
    expect(inserted.name).toBe('write tests')

    const found = await tasksRepository.findById(inserted.id)
    expect(found?.id).toBe(inserted.id)
  })

  it('lists all tasks', async () => {
    await tasksRepository.insertOne({ name: 'second task', done: false })
    const { data, total } = await tasksRepository.findMany(1, 1)
    expect(data).toHaveLength(1)
    expect(total).toBeGreaterThanOrEqual(2)
  })

  it('updates a task', async () => {
    const inserted = await tasksRepository.insertOne({ name: 'to update', done: false })
    const updated = await tasksRepository.updateById(inserted.id, { done: true })
    expect(updated?.done).toBe(true)
  })

  it('deletes a task', async () => {
    const inserted = await tasksRepository.insertOne({ name: 'to delete', done: false })
    const deleted = await tasksRepository.deleteById(inserted.id)
    expect(deleted?.id).toBe(inserted.id)

    const found = await tasksRepository.findById(inserted.id)
    expect(found).toBeUndefined()
  })
})
