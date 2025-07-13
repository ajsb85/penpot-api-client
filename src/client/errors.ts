/**
 * @file This file defines custom error classes for the Penpot API client,
 * providing a structured and consistent way to handle errors originating
 * from API interactions or internal client issues.
 *
 * @remarks
 * By extending a common base `ApiError`, consumers can easily differentiate
 * between errors from the API client and other runtime errors.
 * This modular approach to error handling enhances code readability,
 * maintainability, and predictability across the entire client.
 *
 * @packageDocumentation
 */

/**
 * The base error class for all client-side exceptions originating from the Penpot API client.
 * All custom errors thrown by the client (e.g., HTTP errors, network errors, client-side processing errors)
 * will be instances of `ApiError` or its subclasses. This allows for a single `instanceof ApiError`
 * check to catch all errors related to the API client.
 *
 * @class ApiError
 * @extends Error
 * @property {unknown} [cause] - Optional. The underlying error that caused this `ApiError`.
 * This property is crucial for error chaining, providing a stack of errors that led to the current one,
 * which greatly aids in debugging and understanding the root cause of an issue.
 * The `override` keyword is explicitly used here as the base `Error` class
 * in modern JavaScript environments now includes its own `cause` property, ensuring proper
 * method/property overriding.
 *
 * @example
 * ```typescript
 * import { ApiError, ApiHttpError, ApiClientError } from "./client/errors.ts";
 *
 * try {
 * // Simulate an API call that might throw an error
 * // throw new ApiHttpError(new Response(null, { status: 404 }), { code: "NOT_FOUND" });
 * } catch (e) {
 * if (e instanceof ApiError) {
 * console.error("An API client error occurred:", e.message);
 * if (e.cause) {
 * console.error("  Caused by:", e.cause);
 * }
 * if (e instanceof ApiHttpError) {
 * console.error(`  HTTP Status: ${e.status}, Details:`, e.details);
 * } else if (e instanceof ApiClientError) {
 * console.error("  Client-side issue:", e.message);
 * }
 * } else {
 * console.error("An unexpected non-API error occurred:", e);
 * }
 * }
 * ```
 */
export abstract class ApiError extends Error {
  /**
   * The underlying error that caused this one.
   * The `override` keyword is required because the base `Error` class
   * now has its own `cause` property.
   */
  public override readonly cause?: unknown;

  /**
   * Creates an instance of `ApiError`.
   *
   * @param {string} message - A human-readable message describing the error.
   * @param {object} [options] - Optional configuration options.
   * @param {unknown} [options.cause] - The underlying cause of this error. This allows for error chaining.
   */
  constructor(message: string, options?: { cause: unknown }) {
    // Pass the options object directly to the base Error constructor.
    // This correctly sets both the `message` and the `cause`.
    super(message, options);
    this.name = this.constructor.name; // Set the name of the error class for easier identification in stack traces.
  }
}

/**
 * An error that occurs due to a non-successful HTTP response (i.e., status code 400 or higher)
 * received from the Penpot API server. This class encapsulates HTTP-specific error details.
 *
 * @class ApiHttpError
 * @extends ApiError
 * @property {number} status - The HTTP status code of the response (e.g., `400` for Bad Request, `401` for Unauthorized, `404` for Not Found, `500` for Internal Server Error).
 * @property {string} statusText - The HTTP status message (e.g., "Not Found", "Internal Server Error").
 * @property {unknown} details - The parsed error response body from the server. This can be a structured JSON object
 * (e.g., `{ code: "OBJECT_NOT_FOUND", message: "Resource not found" }`) or a plain text string,
 * providing more granular information about the API error.
 *
 * @example
 * ```typescript
 * import { ApiHttpError } from "./client/errors.ts";
 *
 * // Example of catching a 404 Not Found error from an API call
 * async function fetchNonExistentResource() {
 * try {
 * // Simulate a fetch call that results in a 404
 * const mockResponse = new Response(JSON.stringify({ code: "OBJECT_NOT_FOUND", message: "File not found" }), {
 * status: 404,
 * statusText: "Not Found",
 * headers: { 'Content-Type': 'application/json' }
 * });
 * if (!mockResponse.ok) {
 * throw new ApiHttpError(mockResponse, await mockResponse.json());
 * }
 * } catch (error) {
 * if (error instanceof ApiHttpError) {
 * console.error(`HTTP Error: ${error.status} ${error.statusText}`);
 * console.error("Error details from server:", error.details);
 * // Safely access properties on `details` if it's an object
 * if (typeof error.details === 'object' && error.details !== null && 'code' in error.details) {
 * console.error(`Specific Error Code: ${error.details.code}`);
 * }
 * }
 * }
 * }
 * fetchNonExistentResource();
 * ```
 */
export class ApiHttpError extends ApiError {
  public readonly status: number;
  public readonly statusText: string;
  public readonly details: unknown;

  /**
   * Creates an instance of `ApiHttpError`.
   *
   * @param {Response} response - The raw `Response` object received from the `fetch` API call.
   * This object provides the HTTP status code and status text.
   * @param {unknown} details - The parsed error details from the response body. This content
   * is typically provided by the API server to explain the error.
   */
  constructor(response: Response, details: unknown) {
    const message = `HTTP Error: ${response.status} ${response.statusText}`;
    // Pass the `details` object as the `cause` to the base constructor for error chaining.
    super(message, { cause: details });
    this.status = response.status;
    this.statusText = response.statusText;
    this.details = details;
  }
}

/**
 * A generic error for issues that occur within the client itself,
 * rather than being direct error responses from the API server.
 * This includes problems like network connectivity failures,
 * errors during middleware processing, or issues encountered while
 * parsing data on the client side.
 *
 * @class ApiClientError
 * @extends ApiError
 *
 * @example
 * ```typescript
 * import { ApiClientError } from "./client/errors.ts";
 *
 * // Example of catching a client-side network error (e.g., no internet connection)
 * async function simulateNetworkFailure() {
 * try {
 * // Simulate a fetch call that fails due to a network error
 * throw new ApiClientError("Failed to connect to the Penpot server.", { cause: new TypeError("Network request failed") });
 * } catch (error) {
 * if (error instanceof ApiClientError) {
 * console.error("Client-side error:", error.message);
 * if (error.cause instanceof TypeError) {
 * console.error("  Underlying cause: A network connectivity issue prevented the request.");
 * }
 * } else {
 * console.error("An unexpected error occurred:", error);
 * }
 * }
 * }
 * simulateNetworkFailure();
 * ```
 */
export class ApiClientError extends ApiError {
  /**
   * Creates an instance of `ApiClientError`.
   *
   * @param {string} message - A human-readable message describing the client-side error.
   * @param {object} [options] - Optional configuration options.
   * @param {unknown} [options.cause] - The underlying cause of this client-side error (e.g., a `TypeError` from `fetch`,
   * or an error thrown by a custom middleware).
   */
  constructor(message: string, options?: { cause: unknown }) {
    super(message, options);
  }
}
