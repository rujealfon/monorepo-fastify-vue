import type { LoginRoute, MeRoute, RegisterRoute } from "./auth.routes";

import type { AppRouteHandler } from "@/api/lib/types";

import * as HttpStatusCodes from "stoker/http-status-codes";

import { InvalidCredentialsError, UserAlreadyExistsError } from "./auth.errors";
import * as repository from "./auth.repository";
import * as service from "./auth.service";

export const register: AppRouteHandler<RegisterRoute> = async (c) => {
  const { email, password } = c.req.valid("json");
  try {
    const result = await service.register(email, password);
    return c.json(result, HttpStatusCodes.CREATED);
  }
  catch (e) {
    if (e instanceof UserAlreadyExistsError) {
      return c.json({ message: "User already exists" }, HttpStatusCodes.CONFLICT);
    }
    throw e;
  }
};

export const me: AppRouteHandler<MeRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  const user = await repository.findById(payload.sub);
  if (!user) {
    return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }
  return c.json({ id: user.id, email: user.email }, HttpStatusCodes.OK);
};

export const login: AppRouteHandler<LoginRoute> = async (c) => {
  const { email, password } = c.req.valid("json");
  try {
    const result = await service.login(email, password);
    return c.json(result, HttpStatusCodes.OK);
  }
  catch (e) {
    if (e instanceof InvalidCredentialsError) {
      return c.json({ message: "Invalid credentials" }, HttpStatusCodes.UNAUTHORIZED);
    }
    throw e;
  }
};
