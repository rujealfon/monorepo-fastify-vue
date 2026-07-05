import type { LoginInput } from "./auth.schema";

import { eq } from "drizzle-orm";

import { db } from "@/api/db";

import { users } from "./auth.schema";

export async function findByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function findById(id: number) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function insertOne(data: LoginInput) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}
