import { sendRequest } from "./_internals/request.ts";
import type { ApiError } from "./errors.ts";
import type { PenpotClientConfig } from "../index.ts";

/**
 * @file This file defines the `ApiResponse` type and the `RequestBuilder` class.
 * The `RequestBuilder` provides a fluent, chainable API for constructing and executing
 * HTTP requests to the Penpot backend, encapsulating all necessary configurations
 * for a single API call.
 *
 * @remarks
 * This module is central to the client's design, offering a consistent and type-safe
 * way to interact with the Penpot API. It abstracts the complexities of `fetch` calls,
 * header management, and error handling into a user-friendly interface.
 *
 * @packageDocumentation
 */

/**
 * Represents the standardized result of an API call.
 * This is a discriminated union, ensuring that consumers explicitly handle
 * both successful data (`data` is present, `error` is `null`) and error states
 * (`error` is present, `data` is `null`). This pattern enhances type safety
 * and forces comprehensive error handling at compile time.
 *
 * @template T - The expected type of the successful data payload in the API response.
 *
 * @interface ApiResponse
 * @property {T | null} data - The successful data payload returned by the API. This will be `null` if an error occurred.
 * @property {ApiError | null} error - An {@link ApiError} object if the request failed. This will be `null` if the request was successful.
 *
 * @example
 * ```typescript
 * import { PenpotClient } from "@ajsb85/penpot-api-client";
 * import { ApiHttpError } from "@ajsb85/penpot-api-client/client/errors";
 * import type { UserProfile } from "@ajsb85/penpot-api-client/types";
 *
 * async function fetchData() {
 * const client = new PenpotClient({ baseUrl: "...", accessToken: "..." });
 *
 * // Example: Handling a successful response for fetching user profile
 * const { data: userProfile, error: profileError } = await client.auth.getProfile().exec();
 * if (userProfile) {
 * // TypeScript knows userProfile is of type UserProfile here
 * console.log("User fetched successfully:", userProfile.fullname);
 * } else if (profileError) {
 * // TypeScript knows profileError is of type ApiError here
 * console.error("Failed to fetch user profile:", profileError.message);
 * }
 *
 * // Example: Handling an error response for a non-existent file
 * const { data: fileData, error: fileError } = await client.files.getFile({ id: "non-existent-id" }).exec();
 * if (fileError) {
 * // Check for specific HTTP error types
 * if (fileError instanceof ApiHttpError && fileError.status === 404) {
 * console.warn("File not found! Check the provided ID.");
 * } else {
 * console.error("An API error occurred:", fileError.message);
 * }
 * }
 * // fileData would be null here
 * ```
 */
export type ApiResponse<T> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: ApiError;
    };

/**
 * A builder for creating and executing API requests in a fluent, chainable manner.
 * It encapsulates the configuration for a single API call, allowing for method chaining
 * to customize headers, access tokens, and request bodies before the request is sent.
 *
 * @template T - The expected success data type for the response of this specific request.
 * This generic type parameter ensures that the `data` field in the `ApiResponse`
 * will be correctly typed upon successful execution.
 *
 * @class RequestBuilder
 * @private {object} requestConfig - Internal configuration object holding the details of the request
 * being built (HTTP method, path, body, headers, and an optional overriding access token).
 * @private {PenpotClientConfig} clientConfig - The global client configuration inherited from the
 * {@link PenpotClient} instance, providing base URL, default access token, and middleware.
 *
 * @example
 * ```typescript
 * import { PenpotClient } from "@ajsb85/penpot-api-client";
 * import type { LoginResponseData } from "@ajsb85/penpot-api-client/client/generated/types";
 *
 * const client = new PenpotClient({ baseUrl: "...", accessToken: "..." });
 *
 * // Example of chaining methods to build and execute a request:
 * async function performLogin() {
 * const { data, error } = await client.auth.login({ email: "user@example.com", password: "password123" })
 * .withHeader("X-Request-Source", "MyWebApp") // Add a custom header
 * .withToken("temp-login-token") // Override the default client token for this request
 * .exec(); // Execute the request
 *
 * if (data) {
 * console.log("Login successful! User ID:", data.userId);
 * } else {
 * console.error("Login failed:", error?.message);
 * }
 * }
 * performLogin();
 * ```
 */
export class RequestBuilder<T> {
  private requestConfig: {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    path: string;
    body?: unknown;
    headers: Headers;
    accessToken?: string;
  };
  private clientConfig: PenpotClientConfig;

  /**
   * @internal - This constructor is not meant for public use.
   * Instances of `RequestBuilder` are typically created internally by the service methods
   * (e.g., `AuthApi.login()`, `FilesApi.getFile()`) within the Penpot API client.
   *
   * @param {PenpotClientConfig} clientConfig - The global configuration of the `PenpotClient` instance.
   * This provides the base URL, default access token, and any global middleware.
   * @param {"GET" | "POST" | "PUT" | "DELETE" | "PATCH"} method - The HTTP method to use for the request.
   * @param {string} path - The API endpoint path, relative to the `baseUrl` configured in `clientConfig`
   * (e.g., `"/command/get-profile"`, `"/command/import-binfile"`).
   * @param {unknown} [body] - Optional. The request body payload. This can be a plain JavaScript object
   * (which will be JSON-stringified), `FormData` (for multipart/form-data), `Uint8Array`, or `Blob`.
   */
  constructor(
    clientConfig: PenpotClientConfig,
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    path: string,
    body?: unknown
  ) {
    this.clientConfig = clientConfig;
    this.requestConfig = {
      method,
      path,
      body,
      // Initialize with default JSON headers, which can be overridden.
      headers: new Headers({
        "Content-Type": "application/json",
        Accept: "application/json",
      }),
    };
  }

  /**
   * Overrides the client's default access token for this specific request.
   * This is particularly useful for scenarios where a temporary token,
   * a token from a different source, or a token with different scopes
   * needs to be used for a single API call without altering the global client configuration.
   *
   * @param {string} token - The temporary access token to use for this request.
   * @returns {this} The current `RequestBuilder` instance, allowing for method chaining.
   *
   * @example
   * ```typescript
   * // Use a token obtained from a refresh flow for a single subsequent request
   * const { data, error } = await client.auth.getProfile()
   * .withToken("fresh-new-access-token")
   * .exec();
   * ```
   */
  public withToken(token: string): this {
    this.requestConfig.accessToken = token;
    return this;
  }

  /**
   * Adds a custom HTTP header to this single request.
   * If a header with the same key already exists in the request configuration,
   * its value will be overwritten by the new value provided. This allows for
   * fine-grained control over request headers for specific API calls.
   *
   * @param {string} key - The header key (e.g., `"X-Request-ID"`, `"If-None-Match"`).
   * @param {string} value - The header value (e.g., `"my-unique-id"`, `"etag-value"`).
   * @returns {this} The current `RequestBuilder` instance, allowing for method chaining.
   *
   * @example
   * ```typescript
   * // Add a custom client identifier header to an import request
   * const { data, error } = await client.files.importFile({ /* ... *\/ })
   * .withHeader("X-Client-Identifier", "MyPenpotCLIApp")
   * .exec();
   * ```
   */
  public withHeader(key: string, value: string): this {
    this.requestConfig.headers.set(key, value);
    return this;
  }

  /**
   * Executes the configured API request.
   * This method is the terminal operation of the `RequestBuilder` chain,
   * initiating the actual network call via the internal `sendRequest` function.
   * It handles the asynchronous nature of network requests and provides a
   * structured `ApiResponse` for consuming the result.
   *
   * @returns {Promise<ApiResponse<T>>} A Promise that resolves to an {@link ApiResponse} object.
   * This object is a discriminated union, meaning it will contain either
   * the successful data (`data` field and `error` is `null`) or an {@link ApiError}
   * (`error` field and `data` is `null`), compelling explicit handling of both outcomes.
   *
   * @example
   * ```typescript
   * import type { UserProfile } from "@ajsb85/penpot-api-client/types";
   *
   * // Assuming `client` is an initialized PenpotClient instance
   * async function fetchAndLogUserProfile() {
   * const { data: profile, error: profileError } = await client.auth.getProfile().exec();
   *
   * if (profile) {
   * console.log("Successfully fetched user profile:", profile.fullname);
   * // You can now safely access profile.id, profile.email, etc.
   * } else {
   * console.error("Failed to fetch user profile:", profileError?.message);
   * // profileError will be an instance of ApiError (e.g., ApiHttpError or ApiClientError)
   * }
   * }
   * fetchAndLogUserProfile();
   * ```
   */
  public async exec(): Promise<ApiResponse<T>> {
    try {
      // Delegate the actual network request and low-level error handling to `sendRequest`.
      const data = await sendRequest<T>(this.clientConfig, this.requestConfig);
      // If `sendRequest` resolves, it means the request was successful, so return data with no error.
      return { data, error: null };
    } catch (error) {
      // If `sendRequest` throws an error (which will be an `ApiError` subclass),
      // catch it and return it within the `ApiResponse` structure, with data as null.
      return { data: null, error: error as ApiError };
    }
  }
}
