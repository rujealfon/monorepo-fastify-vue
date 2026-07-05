import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskNotFoundError } from "../tasks.errors";
import * as repository from "../tasks.repository";
import * as service from "../tasks.service";

vi.mock("../tasks.repository");

const mockTask = { id: 1, name: "Test task", done: false, createdAt: new Date(), updatedAt: new Date() };

describe("tasks service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("listTasks", () => {
    it("returns all tasks from repository", async () => {
      vi.mocked(repository.findMany).mockResolvedValue([mockTask]);
      const result = await service.listTasks();
      expect(result).toEqual([mockTask]);
      expect(repository.findMany).toHaveBeenCalledOnce();
    });
  });

  describe("getTask", () => {
    it("returns task when found", async () => {
      vi.mocked(repository.findById).mockResolvedValue(mockTask);
      const result = await service.getTask(1);
      expect(result).toEqual(mockTask);
    });

    it("throws TaskNotFoundError when task does not exist", async () => {
      vi.mocked(repository.findById).mockResolvedValue(undefined);
      await expect(service.getTask(999)).rejects.toThrow(TaskNotFoundError);
    });
  });

  describe("createTask", () => {
    it("inserts and returns the new task", async () => {
      vi.mocked(repository.insertOne).mockResolvedValue(mockTask);
      const result = await service.createTask({ name: "Test task", done: false });
      expect(result).toEqual(mockTask);
      expect(repository.insertOne).toHaveBeenCalledWith({ name: "Test task", done: false });
    });
  });

  describe("updateTask", () => {
    it("updates and returns the task", async () => {
      const updated = { ...mockTask, done: true };
      vi.mocked(repository.updateById).mockResolvedValue(updated);
      const result = await service.updateTask(1, { done: true });
      expect(result.done).toBe(true);
    });

    it("throws TaskNotFoundError when task does not exist", async () => {
      vi.mocked(repository.updateById).mockResolvedValue(undefined as never);
      await expect(service.updateTask(999, { done: true })).rejects.toThrow(TaskNotFoundError);
    });
  });

  describe("deleteTask", () => {
    it("deletes and returns the task", async () => {
      vi.mocked(repository.deleteById).mockResolvedValue(mockTask);
      const result = await service.deleteTask(1);
      expect(result).toEqual(mockTask);
    });

    it("throws TaskNotFoundError when task does not exist", async () => {
      vi.mocked(repository.deleteById).mockResolvedValue(undefined as never);
      await expect(service.deleteTask(999)).rejects.toThrow(TaskNotFoundError);
    });
  });
});
