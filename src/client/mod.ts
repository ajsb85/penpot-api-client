// src/client/mod.ts

import { AuthApi } from "./generated/auth_api.ts";
import { FilesApi } from "./generated/files_api.ts";
import { ProjectsApi } from "./generated/projects_api.ts";

import type { Email, UserProfileResponse, ImportBinfileSuccessResponse } from "./auth.ts";
import type { UUID } from "./generated/types.ts";

import { ApiClientError, AuthenticationError } from "./_internals/errors.ts";
// The request utility is now imported as 'request' directly for generated modules,
// but for the main client, we'll use `this.getAuthToken` to pass it down.
// `parseTransitArrayMap` is also available via _internals/utils.ts
// We are exporting the error classes from _internals/errors.ts
// Re-export request as _request if needed for internal client logic, but it's not used directly here.
import { request as _request } from "./_internals/mod.ts";


export { ApiClientError, AuthenticationError };
export type { Email, UserProfileResponse, UUID, ImportBinfileSuccessResponse };


/**
 * The main Penpot API Client.
 * Authenticates using an 'auth-token' cookie value for programmatic access.
 */
export class PenpotClient {
  private baseUrl: string;
  private authToken?: string; // Stores the auth-token cookie value

  public auth: AuthApi;
  public files: FilesApi;
  public projects: ProjectsApi;

  /**
   * @param baseUrl The base URL of the Penpot API (e.g., "https://design.penpot.app/api/rpc").
   * @param authToken Your 'auth-token' cookie value generated from a browser session.
   */
  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken; // Initialize with provided token if any

    // Pass a getter for the current auth token to generated API classes
    const getAuthToken = () => this.authToken;
    const setAuthToken = (token: string) => { this.authToken = token; }; // Setter for potential future use (e.g. if login actually returned it)

    this.auth = new AuthApi(this.baseUrl, getAuthToken, setAuthToken);
    this.files = new FilesApi(this.baseUrl, getAuthToken);
    this.projects = new ProjectsApi(this.baseUrl, getAuthToken);
  }

  /**
   * Logs into Penpot using email and password.
   * This method primarily verifies credentials and fetches user profile.
   * Based on analysis, this endpoint does NOT automatically acquire or set the
   * 'auth-token' cookie in its response headers for programmatic use.
   *
   * For programmatic API access, this client relies on the 'authToken'
   * provided in the constructor (which should come from a browser session's cookies).
   *
   * @param email User's email.
   * @param password User's password.
   * @param invitationToken Optional invitation token.
   * @returns UserProfileResponse on success, null on failure.
   * @throws {ApiClientError} or {AuthenticationError} if the login API call fails.
   */
  public async loginWithPassword(
    email: Email,
    password: string,
    invitationToken?: string,
  ): Promise<UserProfileResponse | null> {
    try {
      // This call now uses the `auth.loginWithPassword` which in turn uses the `request` utility.
      // The `request` utility will handle the fetch and Transit parsing.
      const userProfile = await this.auth.loginWithPassword(email, password, invitationToken);
      return userProfile;

    } catch (error: unknown) {
      if (error instanceof AuthenticationError) {
        throw error;
      } else if (error instanceof ApiClientError) {
        throw error;
      } else if (error instanceof Error) {
        throw new ApiClientError(`Login failed: ${error.message}`);
      } else {
        throw new ApiClientError(`An unknown error occurred during login.`);
      }
    }
  }

  /**
   * Sets the auth-token for the client.
   * Use this if you obtain a new auth-token outside of the loginWithPassword flow.
   * @param token The new auth-token string.
   */
  public setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Gets the current auth-token stored in the client.
   * @returns The current auth-token string, or undefined if not set.
   */
  public getAuthToken(): string | undefined {
    return this.authToken;
  }
}