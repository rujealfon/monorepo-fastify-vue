import type { insertTasksSchema, patchTasksSchema } from "./tasks.schema";

import { eq } from "drizzle-orm";

import { db } from "@/api/db";

import { tasks } from "./tasks.schema";

export async function findMany() {
  return db.query.tasks.findMany({
    orderBy(fields, operators) {
      return operators.desc(fields.createdAt);
    },
  });
}

export async function findById(id: number) {
  return db.query.tasks.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });
}

export async function insertOne(data: insertTasksSchema) {
  const [inserted] = await db.insert(tasks).values(data).returning();
  return inserted;
}

export async function updateById(id: number, data: patchTasksSchema) {
  const [updated] = await db.update(tasks)
    .set(data)
    .where(eq(tasks.id, id))
    .returning();
  return updated;
}

export async function deleteById(id: number) {
  const [deleted] = await db.delete(tasks)
    .where(eq(tasks.id, id))
    .returning();
  return deleted;
}
