import { sendRequest } from "./_internals/request.ts";
import type { ApiError } from "./errors.ts";
import type { PenpotClientConfig } from "../index.ts";

/**
 * Represents the result of an API call.
 * It's a discriminated union containing either the success data or an error.
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
 * It encapsulates the configuration for a single API call.
 *
 * @template T The expected success data type for the response.
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
   * Instances are created by the service methods.
   */
  constructor(
    clientConfig: PenpotClientConfig,
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    path: string,
    body?: unknown,
  ) {
    this.clientConfig = clientConfig;
    this.requestConfig = {
      method,
      path,
      body,
      headers: new Headers({
        "Content-Type": "application/json",
        Accept: "application/json",
      }),
    };
  }

  /**
   * Overrides the client's default access token for this single request.
   *
   * @param token The temporary access token.
   * @returns The `RequestBuilder` instance for chaining.
   */
  public withToken(token: string): this {
    this.requestConfig.accessToken = token;
    return this;
  }

  /**
   * Adds a custom header to this single request.
   * If the header already exists, it will be overwritten.
   *
   * @param key The header key.
   * @param value The header value.
   * @returns The `RequestBuilder` instance for chaining.
   */
  public withHeader(key: string, value: string): this {
    this.requestConfig.headers.set(key, value);
    return this;
  }

  /**
   * Executes the configured API request.
   * This method is the terminal operation of the chain.
   *
   * @returns A promise that resolves to an `ApiResponse` object,
   * which contains either the success data or an error.
   */
  public async exec(): Promise<ApiResponse<T>> {
    try {
      const data = await sendRequest<T>(this.clientConfig, this.requestConfig);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as ApiError };
    }
  }
}
