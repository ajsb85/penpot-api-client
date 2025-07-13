/**
 * The base error class for all client-side exceptions.
 * This allows consumers to catch all errors originating from the API client
 * with a single `catch (e)` block and an `instanceof ApiError` check.
 */
export abstract class ApiError extends Error {
  /**
   * The underlying error that caused this one.
   * The `override` keyword is required because the base `Error` class
   * now has its own `cause` property.
   */
  public override readonly cause?: unknown;

  constructor(message: string, options?: { cause: unknown }) {
    // Pass the options object directly to the base Error constructor.
    // This correctly sets both the `message` and the `cause`.
    super(message, options);
    this.name = this.constructor.name;
  }
}

/**
 * An error that occurs due to a non-successful HTTP response (i.e., status >= 400).
 * It includes the HTTP status, status text, and the parsed error response body.
 */
export class ApiHttpError extends ApiError {
  public readonly status: number;
  public readonly statusText: string;
  public readonly details: unknown;

  constructor(response: Response, details: unknown) {
    const message = `HTTP Error: ${response.status} ${response.statusText}`;
    // Pass the `details` object as the `cause` to the base constructor.
    super(message, { cause: details });
    this.status = response.status;
    this.statusText = response.statusText;
    this.details = details;
  }
}

/**
 * A generic error for issues that occur within the client itself,
 * such as network failures, middleware errors, or parsing problems.
 */
export class ApiClientError extends ApiError {
  constructor(message: string, options?: { cause: unknown }) {
    super(message, options);
  }
}
