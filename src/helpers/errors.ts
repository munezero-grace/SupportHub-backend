export class AuthError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}
