import type { GetProfileRoute, UpsertProfileRoute } from "./profile.routes";

import type { AppRouteHandler } from "@/api/lib/types";

import * as HttpStatusCodes from "stoker/http-status-codes";

import { ProfileNotFoundError } from "./profile.errors";
import * as service from "./profile.service";

export const getProfile: AppRouteHandler<GetProfileRoute> = async (c) => {
  const { sub } = c.get("jwtPayload");
  try {
    const profile = await service.getProfile(sub);
    return c.json(profile, HttpStatusCodes.OK);
  }
  catch (e) {
    if (e instanceof ProfileNotFoundError) {
      return c.json({ message: "Profile not found" }, HttpStatusCodes.NOT_FOUND);
    }
    throw e;
  }
};

export const upsertProfile: AppRouteHandler<UpsertProfileRoute> = async (c) => {
  const { sub } = c.get("jwtPayload");
  const data = c.req.valid("json");
  const profile = await service.upsertProfile(sub, data);
  return c.json(profile, HttpStatusCodes.OK);
};
