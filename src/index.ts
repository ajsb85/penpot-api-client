/**
 * @file # Penpot API Client
 *
 * A modern, multi-runtime, type-safe API client for Penpot.
 *
 * @remarks
 * This module serves as the primary entry point for the Penpot API client.
 * It provides the main {@link PenpotClient} class, which orchestrates interactions
 * with various Penpot API services (e.g., authentication, file management).
 *
 * The client is designed for broad compatibility across different JavaScript runtimes,
 * including Deno, Node.js, Bun, and modern web browsers. It emphasizes type safety
 * to enhance developer experience and reduce common runtime errors.
 *
 * @module
 * @packageDocumentation
 */

import { AuthApi } from "./client/services/auth.ts";
import { FilesApi } from "./client/services/files.ts";
import type { ApiError } from "./client/errors.ts";
import type { FetchMiddleware } from "./client/_internals/middleware.ts";

/**
 * Configuration options for the {@link PenpotClient}.
 * This interface defines the essential parameters required to initialize the client,
 * controlling its behavior regarding base URL, authentication, and debugging.
 *
 * @interface PenpotClientConfig
 * @property {string} baseUrl - The base URL of the Penpot instance's API endpoint (e.g., `"https://design.penpot.app/api/rpc"`).
 * This URL is prepended to all API endpoint paths.
 * @property {string} accessToken - The personal access token for authentication. This token is crucial
 * for authorizing API requests and accessing user-specific resources. It should be securely managed.
 * @property {FetchMiddleware[]} [middleware] - Optional. An array of {@link FetchMiddleware} objects.
 * These middleware functions can intercept and modify outgoing requests and incoming responses,
 * allowing for custom logic such as logging, caching, or dynamic header manipulation.
 * @property {boolean} [debug=false] - Optional. If `true`, enables verbose logging of request and response details
 * to the console. This is highly useful for debugging API interactions and understanding data flow.
 * Defaults to `false`.
 *
 * @example
 * ```typescript
 * const config: PenpotClientConfig = {
 * baseUrl: "[https://design.penpot.app/api/rpc](https://design.penpot.app/api/rpc)", // Your Penpot instance's RPC API base URL
 * accessToken: "your_personal_access_token",
 * debug: true, // Enable debug logging to console
 * middleware: [
 * // Add custom middleware here, e.g., for custom error handling or request modification
 * // { onRequest: (req) => { console.log("Custom middleware: Outgoing request to", req.url); return req; } }
 * ]
 * };
 * ```
 */
export interface PenpotClientConfig {
  /** The base URL of the Penpot instance (e.g., "https://design.penpot.app"). */
  baseUrl: string;
  /** The personal access token for authentication. */
  accessToken: string;
  /** Optional array of middleware to intercept requests and responses. */
  middleware?: FetchMiddleware[];
  /** If true, logs detailed request information to the console. Defaults to false. */
  debug?: boolean;
}

/**
 * The main client for interacting with the Penpot API.
 * This class serves as the primary entry point for developers, providing organized access
 * to different API services through dedicated namespaces (`auth`, `files`).
 *
 * @class PenpotClient
 * @property {AuthApi} auth - An instance of {@link AuthApi} for handling authentication-related API calls.
 * This includes operations like user login, logout, and fetching user profiles.
 * @property {FilesApi} files - An instance of {@link FilesApi} for managing files, projects,
 * and related assets (e.g., importing/exporting files, handling comments and snapshots).
 * @private {PenpotClientConfig} config - The internal configuration object used to initialize this client.
 * This object holds the `baseUrl`, `accessToken`, and other global settings.
 *
 * @example
 * ```typescript
 * import { PenpotClient } from "@ajsb85/penpot-api-client";
 * import { ApiHttpError } from "@ajsb85/penpot-api-client/client/errors";
 * import type { UserProfile } from "@ajsb85/penpot-api-client/types";
 *
 * async function main() {
 * // Initialize the PenpotClient with your instance's API base URL and a personal access token.
 * // The base URL for RPC commands is typically `https://<your-penpot-domain>/api/rpc`.
 * const client = new PenpotClient({
 * baseUrl: "[https://design.penpot.app/api/rpc](https://design.penpot.app/api/rpc)", // Replace with your Penpot instance's RPC API base URL
 * accessToken: "your_personal_access_token_here", // Obtain this from your Penpot user settings
 * debug: true, // Enable verbose logging for easier debugging
 * });
 *
 * try {
 * // Example: Fetch current user details using the authentication service
 * const { data: currentUser, error: userError } = await client.auth.getProfile().exec();
 *
 * if (currentUser) {
 * console.log("Current User Full Name:", currentUser.fullname);
 * console.log("Current User Email:", currentUser.email);
 * } else if (userError) {
 * console.error("Error fetching user profile:", userError.message);
 * if (userError instanceof ApiHttpError && userError.status === 401) {
 * console.error("Authentication failed. Please check your access token.");
 * }
 * }
 *
 * // Example: List files in a specific project using the files service
 * // Replace 'your-project-id' with an actual Penpot project ID from your instance
 * // const projectId = "your-project-id";
 * // const { data: filesData, error: filesError } = await client.files.listFiles({ projectId, filter: { limit: 10 } }).exec();
 * // if (filesData) {
 * //   console.log(`Files in project ${projectId}:`, filesData.items.map(f => f.name));
 * // } else if (filesError) {
 * //   console.error(`Error listing files for project ${projectId}:`, filesError.message);
 * // }
 *
 * } catch (error) {
 * console.error("An unexpected error occurred during client initialization or API call:", error);
 * }
 * }
 *
 * main();
 * ```
 */
export class PenpotClient {
  public readonly auth: AuthApi;
  public readonly files: FilesApi;
  // Add other service namespaces here as they are implemented.
  // public readonly projects: ProjectsApi;
  // public readonly teams: TeamsApi;

  private config: PenpotClientConfig;

  /**
   * Creates a new instance of the Penpot API client.
   *
   * @param {PenpotClientConfig} config - The client configuration object.
   * It must include `baseUrl` (the Penpot API RPC endpoint, e.g., `https://design.penpot.app/api/rpc`)
   * and a valid `accessToken`.
   * @throws {Error} If `config.baseUrl` or `config.accessToken` are not provided or are invalid strings.
   * This ensures the client is properly configured before making any API requests.
   *
   * @example
   * ```typescript
   * const client = new PenpotClient({
   * baseUrl: "[https://design.penpot.app/api/rpc](https://design.penpot.app/api/rpc)", // Required
   * accessToken: "your_personal_access_token", // Required
   * debug: true // Optional: Enable debug logging
   * });
   * ```
   */
  constructor(config: PenpotClientConfig) {
    // Merge provided config with default debug setting.
    this.config = { debug: false, ...config };

    // Validate essential configuration parameters.
    if (!this.config.baseUrl || typeof this.config.baseUrl !== "string") {
      throw new Error(
        "PenpotClientConfig: 'baseUrl' is required and must be a string."
      );
    }
    if (
      !this.config.accessToken ||
      typeof this.config.accessToken !== "string"
    ) {
      throw new Error(
        "PenpotClientConfig: 'accessToken' is required and must be a string."
      );
    }

    // Initialize the API service namespaces, passing the client configuration.
    // This allows each service to inherit the base URL, access token, middleware, and debug settings,
    // ensuring consistent behavior across all API interactions.
    this.auth = new AuthApi(this.config);
    this.files = new FilesApi(this.config);
  }
}

// Export key types for consumers of the library.
/**
 * Re-exports the base {@link ApiError} class.
 * This allows consumers to catch all errors originating from the API client
 * with a single `catch (e)` block and an `instanceof ApiError` check.
 * @type {ApiError}
 */
export type { ApiError };
/**
 * Re-exports the {@link FetchMiddleware} interface.
 * This allows consumers to define and provide custom middleware functions
 * to intercept and modify HTTP requests and responses.
 * @type {FetchMiddleware}
 */
export type { FetchMiddleware };
