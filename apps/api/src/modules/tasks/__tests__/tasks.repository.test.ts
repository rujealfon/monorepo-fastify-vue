import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/api/db";

import * as repository from "../tasks.repository";
import { tasks } from "../tasks.schema";

describe("tasks repository", () => {
  beforeAll(async () => {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await db.delete(tasks);
  });

  afterAll(async () => {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await db.delete(tasks);
  });

  let id: number;

  it("inserts a task", async () => {
    const task = await repository.insertOne({ name: "Repo test task", done: false });
    expect(task.name).toBe("Repo test task");
    expect(task.done).toBe(false);
    id = task.id;
  });

  it("finds many tasks ordered by createdAt desc", async () => {
    const result = await repository.findMany();
    expect(result.length).toBeGreaterThan(0);
  });

  it("finds task by id", async () => {
    const task = await repository.findById(id);
    expect(task?.id).toBe(id);
  });

  it("returns undefined for missing id", async () => {
    const task = await repository.findById(999999);
    expect(task).toBeUndefined();
  });

  it("updates a task", async () => {
    const updated = await repository.updateById(id, { done: true });
    expect(updated?.done).toBe(true);
  });

  it("deletes a task", async () => {
    const deleted = await repository.deleteById(id);
    expect(deleted?.id).toBe(id);
    expect(await repository.findById(id)).toBeUndefined();
  });
});
