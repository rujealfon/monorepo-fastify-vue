import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskNotFoundError } from "../tasks.errors.js";
import * as tasksRepository from "../tasks.repository.js";
import * as tasksService from "../tasks.service.js";

vi.mock("../tasks.repository.js");

const sampleTask = {
  id: 1,
  name: "sample",
  done: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("tasks.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("getTask returns the task from the repository", async () => {
    vi.mocked(tasksRepository.findById).mockResolvedValue(sampleTask);

    const task = await tasksService.getTask(1);
    expect(tasksRepository.findById).toHaveBeenCalledWith(1);
    expect(task).toEqual(sampleTask);
  });

  it("getTask throws TaskNotFoundError when the repository finds nothing", async () => {
    vi.mocked(tasksRepository.findById).mockResolvedValue(undefined);

    await expect(tasksService.getTask(404)).rejects.toThrow(TaskNotFoundError);
  });

  it("updateTask throws TaskNotFoundError when the repository finds nothing", async () => {
    vi.mocked(tasksRepository.updateById).mockResolvedValue(undefined);

    await expect(tasksService.updateTask(404, { done: true })).rejects.toThrow(TaskNotFoundError);
  });

  it("deleteTask throws TaskNotFoundError when the repository finds nothing", async () => {
    vi.mocked(tasksRepository.deleteById).mockResolvedValue(undefined);

    await expect(tasksService.deleteTask(404)).rejects.toThrow(TaskNotFoundError);
  });

  it("createTask delegates to the repository", async () => {
    vi.mocked(tasksRepository.insertOne).mockResolvedValue(sampleTask);

    const task = await tasksService.createTask({ name: "sample", done: false });
    expect(tasksRepository.insertOne).toHaveBeenCalledWith({ name: "sample", done: false });
    expect(task).toEqual(sampleTask);
  });
});
