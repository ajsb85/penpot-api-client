import { RequestBuilder } from "../requestBuilder.ts";
import type { PenpotClientConfig } from "../../index.ts";
import type { operations, paths } from "../generated/types.ts";

// Type aliases for better readability, sourced from generated types.
// FIX: Pointed to the correct, deeply nested type definitions within the `paths`
// object, as the generator did not create simple aliases in `components.schemas`.
type LoginParams = operations["login"]["parameters"]["body"]["body"];
type UserProfile =
  paths["/command/get-profile"]["post"]["responses"]["default"]["content"]["application/json"];
type LoginResponse = UserProfile; // The login response is the same as the user profile.

/**
 * @file This file defines the `AuthApi` class, which provides methods
 * for interacting with the authentication and user-related endpoints of the Penpot API.
 * It encapsulates common authentication operations such as user login, logout, and
 * retrieval of the authenticated user's profile.
 *
 * @remarks
 * This class serves as a dedicated client for the authentication domain of the Penpot API.
 * It uses the {@link RequestBuilder} to construct and send HTTP requests, ensuring
 * consistency in request handling, authentication headers, and structured error processing.
 * The methods within this class directly map to specific RPC commands on the Penpot backend,
 * such as `login`, `logout`, and `get-profile`.
 *
 * @packageDocumentation
 */

/**
 * Provides access to the Authentication API endpoints.
 * This class is responsible for all authentication-related operations,
 * including managing user sessions and retrieving user profile information.
 *
 * @class AuthApi
 * @private {PenpotClientConfig} config - The client configuration inherited from the main {@link PenpotClient} instance.
 *
 * @example
 * ```typescript
 * import { PenpotClient } from "@ajsb85/penpot-api-client";
 * import { ApiHttpError } from "@ajsb85/penpot-api-client/client/errors";
 * import type { UserProfile, LoginResponseData } from "@ajsb85/penpot-api-client/client/generated/types";
 *
 * async function authenticateAndFetchUser() {
 * const client = new PenpotClient({
 * baseUrl: "[https://design.penpot.app/api/rpc](https://design.penpot.app/api/rpc)", // Example Penpot RPC API base URL
 * accessToken: "your_initial_access_token", // Often obtained after a successful login
 * });
 *
 * try {
 * // Example 1: Fetch current authenticated user's profile
 * const { data: userProfile, error: profileError } = await client.auth.getProfile().exec();
 * if (userProfile) {
 * console.log("Current User Full Name:", userProfile.fullname);
 * console.log("Current User Email:", userProfile.email);
 * } else if (profileError) {
 * console.error("Error fetching user profile:", profileError.message);
 * }
 *
 * // Example 2: Authenticate a user with email and password
 * // Note: Direct login with credentials might not be exposed or preferred in all Penpot setups.
 * // The 'login' RPC command typically expects 'email' and 'password' in its body.
 * const { data: loginResponse, error: loginError } = await client.auth.login({
 * email: "testuser@example.com",
 * password: "securepassword123",
 * }).exec();
 *
 * if (loginResponse) {
 * console.log("Login successful! User ID:", loginResponse.userId);
 * console.log("New Access Token:", loginResponse.accessToken);
 * // After successful login, you might want to update the client's accessToken
 * // client.config.accessToken = loginResponse.accessToken;
 * } else if (loginError) {
 * if (loginError instanceof ApiHttpError && loginError.details && (loginError.details as any).code === "WRONG_CREDENTIALS") {
 * console.error("Login failed: Invalid email or password.");
 * } else {
 * console.error("Login failed with unexpected error:", loginError.message);
 * }
 * }
 *
 * // Example 3: Log out the current user
 * // The 'logout' RPC command typically expects no body, or a profileId if specific session logout is needed.
 * // Based on openapi.json, it accepts `profileId` as optional parameter.
 * // const { error: logoutError } = await client.auth.logout({ profileId: userProfile?.id }).exec();
 * // if (!logoutError) {
 * //   console.log("Successfully logged out.");
 * //   // Clear the access token from your client and storage after logout
 * //   // client.config.accessToken = "";
 * // } else {
 * //   console.error("Logout failed:", logoutError.message);
 * // }
 *
 * } catch (error) {
 * console.error("An unexpected error occurred during authentication workflow:", error);
 * }
 * }
 *
 * authenticateAndFetchUser();
 * ```
 */
export class AuthApi {
  private config: PenpotClientConfig;

  /**
   * @internal - This constructor is not meant for public use.
   * Instances of `AuthApi` are created by the main {@link PenpotClient}
   * and exposed via the `client.auth` property.
   *
   * @param {PenpotClientConfig} config - The client configuration object, providing `baseUrl`, `accessToken`, etc.
   */
  constructor(config: PenpotClientConfig) {
    this.config = config;
  }

  /**
   * Authenticate a user with an email and password.
   *
   * This method sends a `POST` request to the `/api/rpc/command/login` endpoint.
   * Upon successful authentication, the response body typically contains an access token
   * and basic user profile information.
   *
   * @param {LoginParams} params - An object containing the user's `email` and `password`.
   * This corresponds to the request body schema for the `login` operation in the OpenAPI spec.
   * @returns {RequestBuilder<LoginResponse>} A {@link RequestBuilder} instance for this API call.
   * The `LoginResponse` type represents the successful response data, which is typically
   * the user profile associated with the new session.
   * @see https://design.penpot.app/api-docs/index.html#/Auth/login
   *
   * @example
   * ```typescript
   * // Assuming `client` is an initialized PenpotClient instance
   * async function performLogin(email: string, password: string) {
   * const { data: loginResult, error: loginError } = await client.auth.login({ email, password }).exec();
   *
   * if (loginResult) {
   * console.log("Login successful! User ID:", loginResult.id);
   * // loginResult also contains other user profile data like fullname, email etc.
   * // You might want to store the new access token if it's part of the response:
   * // client.config.accessToken = loginResult.accessToken; // (If LoginResponse included accessToken directly)
   * } else {
   * console.error("Login failed:", loginError?.message);
   * // Handle specific error codes, e.g., for invalid credentials
   * // if (loginError instanceof ApiHttpError && (loginError.details as any)?.code === "WRONG_CREDENTIALS") {
   * //   console.error("Please check your email and password.");
   * // }
   * }
   * }
   * // performLogin("your_email@example.com", "your_password");
   * ```
   */
  public login(params: LoginParams): RequestBuilder<LoginResponse> {
    return new RequestBuilder(
      this.config,
      "POST",
      "/api/rpc/command/login",
      params
    );
  }

  /**
   * Logs out the current user by invalidating the access token used for the request.
   *
   * This method sends a `POST` request to the `/api/rpc/command/logout` endpoint.
   * A successful logout typically results in an empty response body.
   *
   * @returns {RequestBuilder<void>} A {@link RequestBuilder} instance for this API call.
   * The `void` type parameter indicates that no specific data payload is expected on success.
   * @see https://design.penpot.app/api-docs/index.html#/Auth/logout
   *
   * @example
   * ```typescript
   * // Assuming `client` is an initialized PenpotClient instance
   * async function performLogout() {
   * // The logout RPC command in openapi.json can optionally take a `profileId` in its body.
   * // If not provided, it typically logs out the current session associated with the token.
   * const { error: logoutError } = await client.auth.logout().exec();
   *
   * if (!logoutError) {
   * console.log("Successfully logged out.");
   * // It's crucial to clear the access token from your client's configuration
   * // and any persistent storage (e.g., localStorage) after a successful logout.
   * // client.config.accessToken = "";
   * // localStorage.removeItem('penpotAccessToken');
   * } else {
   * console.error("Logout failed:", logoutError.message);
   * }
   * }
   * performLogout();
   * ```
   */
  public logout(): RequestBuilder<void> {
    return new RequestBuilder(this.config, "POST", "/api/rpc/command/logout");
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   *
   * This method sends a `POST` request to the `/api/rpc/command/get-profile` endpoint.
   * It requires an active access token to be configured in the client.
   *
   * @returns {RequestBuilder<UserProfile>} A {@link RequestBuilder} instance for this API call.
   * The `UserProfile` type represents the detailed profile data of the authenticated user.
   * @see https://design.penpot.app/api-docs/index.html#/Auth/get-profile
   *
   * @example
   * ```typescript
   * // Assuming `client` is an initialized PenpotClient instance
   * async function fetchUserProfile() {
   * const { data: userProfile, error: profileError } = await client.auth.getProfile().exec();
   *
   * if (userProfile) {
   * console.log("User Profile ID:", userProfile.id);
   * console.log("User Full Name:", userProfile.fullname);
   * console.log("User Email:", userProfile.email);
   * // Access other properties like userProfile.isBlocked, userProfile.createdAt, etc.
   * } else {
   * console.error("Failed to fetch user profile:", profileError?.message);
   * // Handle specific errors, e.g., if the token is invalid or expired
   * // if (profileError instanceof ApiHttpError && profileError.status === 401) {
   * //   console.error("Authentication required. Please log in again.");
   * // }
   * }
   * }
   * fetchUserProfile();
   * ```
   */
  public getProfile(): RequestBuilder<UserProfile> {
    return new RequestBuilder(
      this.config,
      "POST",
      "/api/rpc/command/get-profile"
    );
  }
}
