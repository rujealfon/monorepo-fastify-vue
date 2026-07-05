export class ProfileNotFoundError extends Error {
  constructor(userId: number) {
    super(`Profile not found for user ${userId}`);
    this.name = "ProfileNotFoundError";
  }
}
