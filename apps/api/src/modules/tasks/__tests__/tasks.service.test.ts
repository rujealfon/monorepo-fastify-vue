import type { AuthorizationContext, PolicyDecision } from '#api/modules/users'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TaskNotFoundError } from '#api/modules/tasks/tasks.errors.js'
import * as tasksRepository from '#api/modules/tasks/tasks.repository.js'
import * as tasksService from '#api/modules/tasks/tasks.service.js'

vi.mock('#api/modules/tasks/tasks.repository.js')

const userId = 'a3f1c2d4-5b6e-4a7f-8c9d-0e1f2a3b4c5d'
const decision: PolicyDecision = { allowed: true, matchedAllowPolicyIds: ['11111111-1111-4111-8111-111111111111'], matchedDenyPolicyIds: [] }
const authorization: AuthorizationContext = {
  actor: { id: userId, email: 'person@example.com', roles: ['member'] },
  admin: false,
  policies: ['tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete'].map((permission, index) => ({
    id: `11111111-1111-4111-8111-11111111111${index}`,
    permission: permission as 'tasks.read',
    effect: 'allow' as const,
    condition: null
  }))
}
const sampleTask = { id: 1, userId, name: 'sample', done: false, createdAt: new Date(), updatedAt: new Date(), ownerEmail: 'person@example.com' }

describe('tasks.service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(tasksRepository.toPolicyTask).mockImplementation(task => ({ id: task.id, ownerId: task.userId, ownerEmail: task.ownerEmail, name: task.name, done: task.done }))
  })

  it('returns server-computed task actions', async () => {
    vi.mocked(tasksRepository.findById).mockResolvedValue(sampleTask)
    await expect(tasksService.getTask(authorization, 1)).resolves.toMatchObject({
      task: { id: 1, actions: { update: true, delete: true } }
    })
  })

  it('keeps missing and denied task reads indistinguishable', async () => {
    vi.mocked(tasksRepository.findById).mockResolvedValue(undefined)
    await expect(tasksService.getTask(authorization, 404)).rejects.toThrow(TaskNotFoundError)
    vi.mocked(tasksRepository.findById).mockResolvedValue(sampleTask)
    await expect(tasksService.getTask({ ...authorization, policies: [] }, 1)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('uses the locked repository decision for mutation authorization', async () => {
    vi.mocked(tasksRepository.updateById).mockResolvedValue({ found: true, decision, task: { ...sampleTask, done: true } })
    await expect(tasksService.updateTask(authorization, 1, { done: true })).resolves.toMatchObject({ task: { done: true } })
    vi.mocked(tasksRepository.deleteById).mockResolvedValue({ found: false })
    await expect(tasksService.deleteTask(authorization, 404)).rejects.toThrow(TaskNotFoundError)
  })
})
