import bcrypt from "bcryptjs";
import { sign } from "hono/jwt";

import { config } from "@/api/config";
import { AuthEvents, eventBus } from "@/api/events";

import { InvalidCredentialsError, UserAlreadyExistsError } from "./auth.errors";
import * as repository from "./auth.repository";

const SALT_ROUNDS = 10;

function tokenExpiry() {
  return Math.floor(Date.now() / 1000) + config.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60;
}

export async function register(email: string, password: string) {
  const existing = await repository.findByEmail(email);
  if (existing)
    throw new UserAlreadyExistsError(email);

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await repository.insertOne({ email, password: hashed });

  const token = await sign(
    { sub: user.id, email: user.email, exp: tokenExpiry() },
    config.JWT_SECRET,
  );

  eventBus.emit(AuthEvents.USER_REGISTERED, { id: user.id, email: user.email });

  return { token, user: { id: user.id, email: user.email } };
}

export async function login(email: string, password: string) {
  const user = await repository.findByEmail(email);
  if (!user)
    throw new InvalidCredentialsError();

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    throw new InvalidCredentialsError();

  const token = await sign(
    { sub: user.id, email: user.email, exp: tokenExpiry() },
    config.JWT_SECRET,
  );

  eventBus.emit(AuthEvents.USER_LOGGED_IN, { id: user.id, email: user.email });

  return { token, user: { id: user.id, email: user.email } };
}
