// Represent expected failures with safe public messages and HTTP status codes.
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}
