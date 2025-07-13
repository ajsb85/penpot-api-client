/**
 * Defines the shape of a middleware object that can intercept
 * and modify fetch requests and responses.
 *
 * This provides a powerful mechanism for adding custom logic like
 * logging, caching, or header manipulation to the request pipeline.
 */
export interface FetchMiddleware {
  /**
   * Called before the request is sent.
   * This function can inspect and modify the `Request` object.
   * It must return a `Request` object or a `Promise` that resolves to one.
   *
   * @param request The outgoing `Request` object.
   * @returns The (potentially modified) `Request` object.
   */
  onRequest?: (request: Request) => Request | Promise<Request>;

  /**
   * Called after a response is received, but before it is processed by the client.
   * This function can inspect and modify the `Response` object.
   * It is useful for handling custom error formats or logging response details.
   * It must return a `Response` object or a `Promise` that resolves to one.
   *
   * @param response The incoming `Response` object.
   * @returns The (potentially modified) `Response` object.
   */
  onResponse?: (response: Response) => Response | Promise<Response>;
}
