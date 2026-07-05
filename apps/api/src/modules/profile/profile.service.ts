import type { upsertProfileSchema } from "./profile.schema";

import { ProfileNotFoundError } from "./profile.errors";
import * as repository from "./profile.repository";

export async function getProfile(userId: number) {
  const profile = await repository.findByUserId(userId);
  if (!profile)
    throw new ProfileNotFoundError(userId);
  return profile;
}

export async function upsertProfile(userId: number, data: upsertProfileSchema) {
  return repository.upsert(userId, data);
}
