import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TaskNotFoundError } from '#api/modules/tasks/tasks.errors.js'
import * as tasksRepository from '#api/modules/tasks/tasks.repository.js'
import * as tasksService from '#api/modules/tasks/tasks.service.js'

vi.mock('#api/modules/tasks/tasks.repository.js')

const userId = 'a3f1c2d4-5b6e-4a7f-8c9d-0e1f2a3b4c5d'

const sampleTask = {
  id: 1,
  userId,
  name: 'sample',
  done: false,
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('tasks.service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('getTask returns the task from the repository', async () => {
    vi.mocked(tasksRepository.findById).mockResolvedValue(sampleTask)

    const task = await tasksService.getTask(userId, 1)
    expect(tasksRepository.findById).toHaveBeenCalledWith(userId, 1)
    expect(task).toEqual(sampleTask)
  })

  it('getTask throws TaskNotFoundError when the repository finds nothing', async () => {
    vi.mocked(tasksRepository.findById).mockResolvedValue(undefined)

    await expect(tasksService.getTask(userId, 404)).rejects.toThrow(TaskNotFoundError)
  })

  it('updateTask throws TaskNotFoundError when the repository finds nothing', async () => {
    vi.mocked(tasksRepository.updateById).mockResolvedValue(undefined)

    await expect(tasksService.updateTask(userId, 404, { done: true })).rejects.toThrow(TaskNotFoundError)
  })

  it('deleteTask throws TaskNotFoundError when the repository finds nothing', async () => {
    vi.mocked(tasksRepository.deleteById).mockResolvedValue(undefined)

    await expect(tasksService.deleteTask(userId, 404)).rejects.toThrow(TaskNotFoundError)
  })

  it('createTask delegates to the repository', async () => {
    vi.mocked(tasksRepository.insertOne).mockResolvedValue(sampleTask)

    const task = await tasksService.createTask(userId, { name: 'sample', done: false })
    expect(tasksRepository.insertOne).toHaveBeenCalledWith(userId, { name: 'sample', done: false })
    expect(task).toEqual(sampleTask)
  })

  it('calculates pagination metadata', async () => {
    vi.mocked(tasksRepository.findMany).mockResolvedValue({ data: [sampleTask], total: 45 })
    await expect(tasksService.listTasks(userId, 2, 20)).resolves.toEqual({
      data: [sampleTask],
      pagination: { page: 2, limit: 20, total: 45, totalPages: 3 }
    })
    expect(tasksRepository.findMany).toHaveBeenCalledWith(userId, 2, 20)
  })
})
