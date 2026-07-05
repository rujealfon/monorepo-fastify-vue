import type { upsertProfileSchema } from "./profile.schema";

import { eq } from "drizzle-orm";

import { db } from "@/api/db";

import { profiles } from "./profile.schema";

export async function findByUserId(userId: number) {
  return db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
}

export async function upsert(userId: number, data: upsertProfileSchema) {
  const [profile] = await db
    .insert(profiles)
    .values({ ...data, userId })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return profile;
}
