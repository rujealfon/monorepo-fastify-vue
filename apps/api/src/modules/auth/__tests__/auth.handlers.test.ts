import { testClient } from "hono/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/api/db";
import createApp from "@/api/lib/create-app";

import router from "../auth.index";
import { users } from "../auth.schema";

const client = testClient(createApp().route("/", router));

const TEST_EMAIL = "test-handler@example.com";
const TEST_PASSWORD = "password123";

describe("auth routes", () => {
  beforeAll(async () => {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await db.delete(users);
  });

  afterAll(async () => {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await db.delete(users);
  });

  describe("pOST /auth/register", () => {
    it("validates missing email", async () => {
      const response = await client.api.v1.auth.register.$post({
        // @ts-expect-error intentionally invalid body
        json: { password: TEST_PASSWORD },
      });
      expect(response.status).toBe(422);
    });

    it("validates missing password", async () => {
      const response = await client.api.v1.auth.register.$post({
        // @ts-expect-error intentionally invalid body
        json: { email: TEST_EMAIL },
      });
      expect(response.status).toBe(422);
    });

    it("validates password minimum length", async () => {
      const response = await client.api.v1.auth.register.$post({
        json: { email: TEST_EMAIL, password: "short" },
      });
      expect(response.status).toBe(422);
      if (response.status === 422) {
        const json = await response.json();
        expect(json.error.issues[0].path[0]).toBe("password");
      }
    });

    it("validates email format", async () => {
      const response = await client.api.v1.auth.register.$post({
        json: { email: "not-an-email", password: TEST_PASSWORD },
      });
      expect(response.status).toBe(422);
      if (response.status === 422) {
        const json = await response.json();
        expect(json.error.issues[0].path[0]).toBe("email");
      }
    });

    it("registers a new user and returns token", async () => {
      const response = await client.api.v1.auth.register.$post({
        json: { email: TEST_EMAIL, password: TEST_PASSWORD },
      });
      expect(response.status).toBe(201);
      if (response.status === 201) {
        const json = await response.json();
        expect(json.token).toBeTypeOf("string");
        expect(json.user.email).toBe(TEST_EMAIL);
        expect(json.user).not.toHaveProperty("password");
      }
    });

    it("returns 409 when email is already registered", async () => {
      const response = await client.api.v1.auth.register.$post({
        json: { email: TEST_EMAIL, password: TEST_PASSWORD },
      });
      expect(response.status).toBe(409);
      if (response.status === 409) {
        const json = await response.json();
        expect(json.message).toBe("User already exists");
      }
    });
  });

  describe("pOST /auth/login", () => {
    it("returns 401 for unknown email", async () => {
      const response = await client.api.v1.auth.login.$post({
        json: { email: "nobody@example.com", password: TEST_PASSWORD },
      });
      expect(response.status).toBe(401);
      if (response.status === 401) {
        const json = await response.json();
        expect(json.message).toBe("Invalid credentials");
      }
    });

    it("returns 401 for wrong password", async () => {
      const response = await client.api.v1.auth.login.$post({
        json: { email: TEST_EMAIL, password: "wrongpassword" },
      });
      expect(response.status).toBe(401);
    });

    it("returns token on successful login", async () => {
      const response = await client.api.v1.auth.login.$post({
        json: { email: TEST_EMAIL, password: TEST_PASSWORD },
      });
      expect(response.status).toBe(200);
      if (response.status === 200) {
        const json = await response.json();
        expect(json.token).toBeTypeOf("string");
        expect(json.user.email).toBe(TEST_EMAIL);
        expect(json.user).not.toHaveProperty("password");
      }
    });
  });
});
