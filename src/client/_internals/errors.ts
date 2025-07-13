// src/client/_internals/errors.ts

/**
 * Base custom error class for all API client-related errors.
 * Provides a structured way to handle errors with additional details.
 */
export class ApiClientError extends Error {
  public status?: number;
  public details?: unknown; // To hold parsed server error response (e.g., JSON)

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

/**
 * Specific error class for authentication failures.
 * Extends ApiClientError.
 */
export class AuthenticationError extends ApiClientError {
  constructor(message: string, status?: number, details?: unknown) {
    super(message, status, details);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}