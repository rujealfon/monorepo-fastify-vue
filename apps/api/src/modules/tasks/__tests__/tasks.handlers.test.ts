import { testClient } from "hono/testing";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodIssueCode } from "zod";

import { db } from "@/api/db";
import { ZOD_ERROR_CODES, ZOD_ERROR_MESSAGES } from "@/api/lib/constants";
import createApp from "@/api/lib/create-app";

import router from "../tasks.index";
import { tasks } from "../tasks.schema";

// Tests use the tasks router directly (no auth middleware) — auth is applied at the features level
const client = testClient(createApp().route("/", router));

describe("tasks routes", async () => {
  beforeAll(async () => {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await db.delete(tasks);
  });

  afterAll(async () => {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await db.delete(tasks);
  });

  it("post /tasks validates the body when creating", async () => {
    const response = await client.api.v1.tasks.$post({
      // @ts-expect-error intentionally missing required `name` field
      json: {
        done: false,
      },
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json();
      expect(json.error.issues[0].path[0]).toBe("name");
      expect(json.error.issues[0].message).toBe(ZOD_ERROR_MESSAGES.REQUIRED);
    }
  });

  let id: number;
  const name = "Learn vitest";

  it("post /tasks creates a task", async () => {
    const response = await client.api.v1.tasks.$post({
      json: {
        name,
        done: false,
      },
    });
    expect(response.status).toBe(201);
    if (response.status === 201) {
      const json = await response.json();
      expect(json.name).toBe(name);
      expect(json.done).toBe(false);
      id = json.id;
    }
  });

  it("get /tasks lists all tasks", async () => {
    const response = await client.api.v1.tasks.$get();
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json.length).toBe(1);
    }
  });

  it("get /tasks/{id} validates the id param", async () => {
    const response = await client.api.v1.tasks[":id"].$get({
      param: {
        id: "wat",
      },
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json();
      expect(json.error.issues[0].path[0]).toBe("id");
      expect(json.error.issues[0].message).toBe(ZOD_ERROR_MESSAGES.EXPECTED_NUMBER);
    }
  });

  it("get /tasks/{id} returns 404 when task not found", async () => {
    const response = await client.api.v1.tasks[":id"].$get({
      param: {
        id: 999999,
      },
    });
    expect(response.status).toBe(404);
    if (response.status === 404) {
      const json = await response.json();
      expect(json.message).toBe(HttpStatusPhrases.NOT_FOUND);
    }
  });

  it("get /tasks/{id} gets a single task", async () => {
    const response = await client.api.v1.tasks[":id"].$get({
      param: {
        id,
      },
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();
      expect(json.name).toBe(name);
      expect(json.done).toBe(false);
    }
  });

  it("patch /tasks/{id} validates the body when updating", async () => {
    const response = await client.api.v1.tasks[":id"].$patch({
      param: {
        id,
      },
      json: {
        name: "",
      },
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json();
      expect(json.error.issues[0].path[0]).toBe("name");
      expect(json.error.issues[0].code).toBe(ZodIssueCode.too_small);
    }
  });

  it("patch /tasks/{id} validates the id param", async () => {
    const response = await client.api.v1.tasks[":id"].$patch({
      param: {
        id: "wat",
      },
      json: {},
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json();
      expect(json.error.issues[0].path[0]).toBe("id");
      expect(json.error.issues[0].message).toBe(ZOD_ERROR_MESSAGES.EXPECTED_NUMBER);
    }
  });

  it("patch /tasks/{id} validates empty body", async () => {
    const response = await client.api.v1.tasks[":id"].$patch({
      param: {
        id,
      },
      json: {},
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json();
      expect(json.error.issues[0].code).toBe(ZOD_ERROR_CODES.INVALID_UPDATES);
      expect(json.error.issues[0].message).toBe(ZOD_ERROR_MESSAGES.NO_UPDATES);
    }
  });

  it("patch /tasks/{id} updates a single property of a task", async () => {
    const response = await client.api.v1.tasks[":id"].$patch({
      param: {
        id,
      },
      json: {
        done: true,
      },
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();
      expect(json.done).toBe(true);
    }
  });

  it("delete /tasks/{id} validates the id when deleting", async () => {
    const response = await client.api.v1.tasks[":id"].$delete({
      param: {
        id: "wat",
      },
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json();
      expect(json.error.issues[0].path[0]).toBe("id");
      expect(json.error.issues[0].message).toBe(ZOD_ERROR_MESSAGES.EXPECTED_NUMBER);
    }
  });

  it("delete /tasks/{id} removes a task", async () => {
    const response = await client.api.v1.tasks[":id"].$delete({
      param: {
        id,
      },
    });
    expect(response.status).toBe(204);
  });
});
