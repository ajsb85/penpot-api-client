import { RequestBuilder } from "../requestBuilder.ts";
import type { PenpotClientConfig } from "../../index.ts";
import type { operations, paths } from "../generated/types.ts";

// Type aliases for better readability, sourced from generated types.
// FIX: Pointed to the correct, deeply nested type definitions within the `paths`
// object, as the generator did not create simple aliases in `components.schemas`.
type LoginParams = operations["login"]["parameters"]["body"]["body"];
type UserProfile =
  paths["/command/get-profile"]["post"]["responses"]["default"]["content"][
    "application/json"
  ];
type LoginResponse = UserProfile; // The login response is the same as the user profile.

/**
 * Provides access to the Authentication API endpoints.
 */
export class AuthApi {
  private config: PenpotClientConfig;

  /**
   * @internal - This constructor is not meant for public use.
   * Instances are created by the main PenpotClient.
   */
  constructor(config: PenpotClientConfig) {
    this.config = config;
  }

  /**
   * Authenticate a user with an email and password.
   *
   * On success, the response body contains the access token and user profile.
   *
   * @param params - An object containing the user's `email` and `password`.
   * @returns A `RequestBuilder` for this API call.
   * @see https://design.penpot.app/api-docs/index.html#/Auth/login
   */
  public login(params: LoginParams): RequestBuilder<LoginResponse> {
    return new RequestBuilder(
      this.config,
      "POST",
      "/api/rpc/command/login",
      params,
    );
  }

  /**
   * Log out the current user.
   *
   * This invalidates the access token used for the request.
   *
   * @returns A `RequestBuilder` for this API call. The response is expected to be empty on success.
   * @see https://design.penpot.app/api-docs/index.html#/Auth/logout
   */
  public logout(): RequestBuilder<void> {
    return new RequestBuilder(this.config, "POST", "/api/rpc/command/logout");
  }

  /**
   * Get the profile of the currently authenticated user.
   *
   * @returns A `RequestBuilder` for this API call.
   * @see https://design.penpot.app/api-docs/index.html#/Auth/get-profile
   */
  public getProfile(): RequestBuilder<UserProfile> {
    return new RequestBuilder(
      this.config,
      "POST",
      "/api/rpc/command/get-profile",
    );
  }
}
