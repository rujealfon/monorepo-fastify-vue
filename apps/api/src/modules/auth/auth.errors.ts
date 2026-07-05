export class UserAlreadyExistsError extends Error {
  readonly email: string;
  constructor(email: string) {
    super(`User with email ${email} already exists`);
    this.name = "UserAlreadyExistsError";
    this.email = email;
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}
