/**
 * @file This file defines the `FetchMiddleware` interface, which specifies the contract
 * for middleware objects capable of intercepting and modifying HTTP `Request` and `Response`
 * objects within the Penpot API client's fetch pipeline.
 *
 * @remarks
 * This middleware pattern provides a powerful and extensible mechanism to inject custom logic
 * into the request-response lifecycle. Common use cases include:
 * - **Logging:** Recording details of outgoing requests and incoming responses.
 * - **Authentication:** Dynamically adding or refreshing authentication tokens.
 * - **Caching:** Implementing client-side caching strategies.
 * - **Error Transformation:** Adapting raw HTTP errors into custom error formats.
 * - **Rate Limiting:** Implementing client-side rate limiting before sending requests.
 * - **Header Manipulation:** Adding, modifying, or removing HTTP headers.
 *
 * Middleware functions are executed in a chain: `onRequest` handlers run sequentially
 * before the `fetch` call, and `onResponse` handlers run in reverse order after the `fetch` call.
 *
 * @packageDocumentation
 */

/**
 * Defines the shape of a middleware object that can intercept
 * and modify fetch requests and responses.
 *
 * This provides a powerful mechanism for adding custom logic like
 * logging, caching, or header manipulation to the request pipeline.
 */
export interface FetchMiddleware {
  /**
   * Called before the `Request` is sent over the network.
   * This function can inspect and synchronously or asynchronously modify the `Request` object.
   * If multiple `onRequest` middleware functions are registered, they are executed in the order
   * they appear in the middleware array.
   *
   * @param {Request} request - The outgoing `Request` object. This object can be cloned and modified.
   * @returns {Request | Promise<Request>} The (potentially modified) `Request` object, or a Promise
   * that resolves to a `Request` object. If a Promise is returned, the middleware chain will
   * pause until the Promise resolves.
   *
   * @example
   * ```typescript
   * // Example: A middleware that adds a custom header to all outgoing requests.
   * const addCustomHeaderMiddleware: FetchMiddleware = {
   * onRequest: (request: Request) => {
   * const newHeaders = new Headers(request.headers);
   * newHeaders.set('X-Client-Version', '1.0.0');
   * return new Request(request, { headers: newHeaders });
   * }
   * };
   *
   * // Example: A logging middleware that logs request details.
   * const requestLoggerMiddleware: FetchMiddleware = {
   * onRequest: async (request: Request) => {
   * console.log(`[Middleware] Sending ${request.method} request to ${request.url}`);
   * // Optionally, log request body (requires cloning the request)
   * // const clonedRequest = request.clone();
   * // console.log('Request Body:', await clonedRequest.text());
   * return request;
   * }
   * };
   * ```
   */
  onRequest?: (request: Request) => Request | Promise<Request>;

  /**
   * Called after a `Response` is received from the network, but before it is
   * processed by the client's `RequestBuilder`.
   * This function can inspect and synchronously or asynchronously modify the `Response` object.
   * If multiple `onResponse` middleware functions are registered, they are executed in the
   * reverse order of their registration (last registered, first executed).
   *
   * @param {Response} response - The incoming `Response` object. This object can be cloned and modified.
   * @returns {Response | Promise<Response>} The (potentially modified) `Response` object, or a Promise
   * that resolves to a `Response` object. If a Promise is returned, the middleware chain will
   * pause until the Promise resolves.
   *
   * @example
   * ```typescript
   * // Example: A middleware that logs response status and body.
   * const responseLoggerMiddleware: FetchMiddleware = {
   * onResponse: async (response: Response) => {
   * console.log(`[Middleware] Received ${response.status} response from ${response.url}`);
   * // Clone response to read body without consuming it for subsequent handlers
   * const clonedResponse = response.clone();
   * try {
   * const responseBody = await clonedResponse.json();
   * console.log('Response Body:', responseBody);
   * } catch (e) {
   * console.log('Response Body (text):', await clonedResponse.text());
   * }
   * return response;
   * }
   * };
   *
   * // Example: A middleware that checks for specific error codes and potentially retries (simplified).
   * const errorHandlingMiddleware: FetchMiddleware = {
   * onResponse: async (response: Response) => {
   * if (response.status === 401) {
   * console.warn('[Middleware] Unauthorized response received. Attempting token refresh...');
   * // In a real scenario, this would trigger token refresh and re-attempt the original request.
   * // For demonstration, we just return the original response.
   * }
   * return response;
   * }
   * };
   * ```
   */
  onResponse?: (response: Response) => Response | Promise<Response>;
}
