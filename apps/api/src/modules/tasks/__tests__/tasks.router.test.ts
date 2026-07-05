import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "../../../db/index.js";
import { tasksRouter } from "../tasks.router.js";

describe("tasks router", () => {
  const caller = tasksRouter.createCaller({});

  beforeAll(async () => {
    await db.execute(sql`truncate table tasks restart identity cascade`);
  });

  afterAll(async () => {
    await db.execute(sql`truncate table tasks restart identity cascade`);
    await db.$client.end();
  });

  it("creates, lists, fetches, patches and deletes a task", async () => {
    const created = await caller.create({ name: "buy milk", done: false });
    expect(created.name).toBe("buy milk");

    const list = await caller.list();
    expect(list).toHaveLength(1);

    const fetched = await caller.getOne({ id: created.id });
    expect(fetched.id).toBe(created.id);

    const patched = await caller.patch({ id: created.id, data: { done: true } });
    expect(patched.done).toBe(true);

    await caller.remove({ id: created.id });
    await expect(caller.getOne({ id: created.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND for a missing task", async () => {
    const error = await caller.getOne({ id: 999_999 }).catch(err => err);
    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe("NOT_FOUND");
  });

  it("throws BAD_REQUEST for an invalid body", async () => {
    const error = await caller.create({ name: "", done: false }).catch(err => err);
    expect(error).toBeInstanceOf(TRPCError);
    expect(error.code).toBe("BAD_REQUEST");
  });
});
