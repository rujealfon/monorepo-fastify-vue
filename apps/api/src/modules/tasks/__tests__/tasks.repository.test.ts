import type { AuthorizationContext, PolicyDecision } from '#api/modules/users'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db } from '#api/db/index.js'
import * as tasksRepository from '#api/modules/tasks/tasks.repository.js'
import { evaluatePolicyDecision } from '#api/modules/users'
import { users } from '#api/modules/users/users.schema.js'

const allow: PolicyDecision = { allowed: true, matchedAllowPolicyIds: [], matchedDenyPolicyIds: [] }
const deny: PolicyDecision = { allowed: false, matchedAllowPolicyIds: [], matchedDenyPolicyIds: [] }

describe('tasks.repository', () => {
  let userId: string
  let otherUserId: string
  let authorization: AuthorizationContext

  beforeAll(async () => {
    await db.execute(sql`truncate table tasks restart identity cascade`)
    await db.execute(sql`truncate table users cascade`)
    const [user, otherUser] = await db.insert(users).values([
      { email: 'tasks-repo-owner@example.com', passwordHash: 'hash' },
      { email: 'tasks-repo-other@example.com', passwordHash: 'hash' }
    ]).returning()
    userId = user.id
    otherUserId = otherUser.id
    authorization = {
      actor: { id: user.id, email: user.email, roles: [] },
      admin: false,
      policies: [{
        id: '11111111-1111-4111-8111-111111111111',
        permission: 'tasks.read',
        effect: 'allow',
        condition: { type: 'compare', field: 'task.ownerId', operator: 'eq', value: { type: 'field', field: 'actor.id' } }
      }]
    }
  })

  afterAll(async () => db.$client.end())

  it('compiles read policies into list filtering and pagination counts', async () => {
    await tasksRepository.insertOne(userId, { name: 'mine' })
    await tasksRepository.insertOne(otherUserId, { name: 'theirs' })
    const result = await tasksRepository.findMany(authorization, 1, 10)
    expect(result.data.map(task => task.name)).toEqual(['mine'])
    expect(result.total).toBe(1)
  })

  it('locks and authorizes updates and deletes', async () => {
    const task = await tasksRepository.insertOne(userId, { name: 'locked' })
    expect(await tasksRepository.updateById(task.id, { done: true }, () => deny)).toMatchObject({ found: true, decision: deny })
    expect((await tasksRepository.findById(task.id))?.done).toBe(false)
    expect(await tasksRepository.updateById(task.id, { done: true }, () => allow)).toMatchObject({ task: { done: true } })
    expect(await tasksRepository.deleteById(task.id, () => allow)).toMatchObject({ task: { id: task.id } })
    expect(await tasksRepository.findById(task.id)).toBeUndefined()
  })

  it('matches nested SQL predicates to the in-memory evaluator', async () => {
    const candidates = await Promise.all([
      tasksRepository.insertOne(userId, { name: 'private open', done: false }),
      tasksRepository.insertOne(otherUserId, { name: 'public open', done: false }),
      tasksRepository.insertOne(otherUserId, { name: 'public blocked', done: true })
    ])
    const nested: AuthorizationContext = {
      ...authorization,
      policies: [
        {
          id: '21111111-1111-4111-8111-111111111111',
          permission: 'tasks.read',
          effect: 'allow',
          condition: {
            type: 'any',
            children: [
              { type: 'compare', field: 'task.ownerId', operator: 'eq', value: { type: 'field', field: 'actor.id' } },
              { type: 'compare', field: 'task.name', operator: 'startsWith', value: { type: 'literal', value: 'public' } }
            ]
          }
        },
        {
          id: '31111111-1111-4111-8111-111111111111',
          permission: 'tasks.read',
          effect: 'deny',
          condition: { type: 'compare', field: 'task.done', operator: 'eq', value: { type: 'literal', value: true } }
        }
      ]
    }
    const actual = await tasksRepository.findMany(nested, 1, 100)
    const expected = candidates.filter(task => evaluatePolicyDecision(nested, 'tasks.read', tasksRepository.toPolicyTask(task)).allowed)
    expect(actual.data.filter(task => candidates.some(candidate => candidate.id === task.id)).map(task => task.id)).toEqual(expected.map(task => task.id).sort((left, right) => left - right))
  })
})
