import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvalidCredentialsError, UserAlreadyExistsError } from "../auth.errors";
import * as repository from "../auth.repository";
import * as service from "../auth.service";

vi.mock("../auth.repository");
vi.mock("@/api/events", () => ({
  eventBus: { emit: vi.fn() },
  AuthEvents: { USER_REGISTERED: "auth.user_registered", USER_LOGGED_IN: "auth.user_logged_in" },
}));

const mockUser = {
  id: 1,
  email: "test@example.com",
  // bcrypt hash of "password123"
  password: "$2b$10$abcdefghijklmnopqrstuuVGmFMBqnTpTqmAWbPIrmq1U5kJT7K8K",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("auth service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("register", () => {
    it("throws UserAlreadyExistsError when email is taken", async () => {
      vi.mocked(repository.findByEmail).mockResolvedValue(mockUser);
      await expect(service.register("test@example.com", "password123"))
        .rejects
        .toThrow(UserAlreadyExistsError);
    });

    it("creates user and returns token when email is new", async () => {
      vi.mocked(repository.findByEmail).mockResolvedValue(undefined);
      vi.mocked(repository.insertOne).mockResolvedValue(mockUser);

      const result = await service.register("new@example.com", "password123");

      expect(result.token).toBeTypeOf("string");
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user).not.toHaveProperty("password");
      expect(repository.insertOne).toHaveBeenCalledOnce();
    });
  });

  describe("login", () => {
    it("throws InvalidCredentialsError when email not found", async () => {
      vi.mocked(repository.findByEmail).mockResolvedValue(undefined);
      await expect(service.login("nobody@example.com", "password123"))
        .rejects
        .toThrow(InvalidCredentialsError);
    });

    it("throws InvalidCredentialsError when password is wrong", async () => {
      vi.mocked(repository.findByEmail).mockResolvedValue(mockUser);
      await expect(service.login("test@example.com", "wrongpassword"))
        .rejects
        .toThrow(InvalidCredentialsError);
    });

    it("returns token on valid credentials", async () => {
      // Use a real bcrypt hash for "password123" — bcryptjs compare is async and real
      const realHash = await import("bcryptjs").then(b => b.hash("password123", 10));
      vi.mocked(repository.findByEmail).mockResolvedValue({ ...mockUser, password: realHash });

      const result = await service.login("test@example.com", "password123");

      expect(result.token).toBeTypeOf("string");
      expect(result.user.email).toBe(mockUser.email);
    });
  });
});
