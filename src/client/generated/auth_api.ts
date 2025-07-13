// src/client/generated/auth_api.ts
// AUTOMATICALLY GENERATED - DO NOT EDIT MANUALLY

// Import the request utility directly from internals
import { request as _internalRequest } from "../_internals/mod.ts";
import type { Email, UserProfileResponse } from "../auth.ts";

export class AuthApi {
  private baseUrl: string;
  private getAuthToken: () => string | undefined; // Renamed from getPersonalAccessToken
  private setAuthToken: (token: string) => void; // Renamed from setPersonalAccessToken

  constructor(
    baseUrl: string,
    getAuthToken: () => string | undefined,
    setAuthToken: (token: string) => void,
  ) {
    this.baseUrl = baseUrl;
    this.getAuthToken = getAuthToken;
    this.setAuthToken = setAuthToken;
  }

  /**
   * Performs authentication using Penpot password. This endpoint returns user profile data
   * and implicitly establishes a session (likely via cookies).
   * Note: This method is for browser-like session establishment. For programmatic API access,
   * initialize PenpotClient with an 'auth-token' cookie value in its constructor.
   * @param email The user's email address.
   * @param password The user's password.
   * @param invitationToken An optional invitation token.
   * @returns The user's profile data if login is successful.
   */
  public async loginWithPassword(
    email: Email,
    password: string,
    invitationToken?: string,
  ): Promise<UserProfileResponse> {
    const requestBody = {
      email,
      password,
      ...(invitationToken && { "invitation-token": invitationToken }),
    };

    // Use the internal request utility, which now correctly handles Cookie-based auth
    // and Transit parsing for this endpoint.
    const userProfile = await _internalRequest<UserProfileResponse>(
      this.baseUrl,
      "/command/login-with-password",
      "POST",
      requestBody,
      "application/json", // Content-Type for the request body
      {}, // Additional headers
      this.getAuthToken(), // Pass the auth-token for authentication (will be sent as Cookie)
    );

    return userProfile;
  }
}