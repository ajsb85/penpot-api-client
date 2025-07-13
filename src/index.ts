/**
 * # Penpot API Client
 *
 * A modern, multi-runtime, type-safe API client for Penpot.
 *
 * @module
 */

import { AuthApi } from "./client/services/auth.ts";
import { FilesApi } from "./client/services/files.ts";
import type { ApiError } from "./client/errors.ts";
import type { FetchMiddleware } from "./client/_internals/middleware.ts";

/**
 * Configuration options for the PenpotClient.
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
 * It provides access to different API services through namespaces.
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
   * @param config The client configuration.
   */
  constructor(config: PenpotClientConfig) {
    this.config = { debug: false, ...config };

    // Initialize the API service namespaces, passing the client configuration.
    this.auth = new AuthApi(this.config);
    this.files = new FilesApi(this.config);
  }
}

// Export key types for consumers of the library.
export type { ApiError };
export type { FetchMiddleware };
