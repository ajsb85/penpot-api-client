/**
 * @file This file provides the core `sendRequest` function, which is responsible for orchestrating
 * the entire HTTP request lifecycle within the Penpot API client. This includes applying middleware,
 * executing the `fetch` call, handling various response content types, and managing error propagation.
 *
 * @remarks
 * This internal module is crucial for maintaining consistency across all API calls made by the client.
 * It abstracts away the complexities of network interactions, ensuring that authentication, debugging,
 * and error handling are uniformly applied.
 *
 * @packageDocumentation
 */

import { ApiClientError, ApiHttpError } from "../errors.ts";
import { handleSseResponse } from "./sse.ts";
import type { PenpotClientConfig } from "../../index.ts";
import type { FetchMiddleware } from "./middleware.ts";

/**
 * @internal
 * Defines the internal configuration for a single HTTP request.
 * This interface encapsulates all necessary details for constructing and sending a `fetch` request.
 *
 * @interface InternalRequestConfig
 * @property {"GET" | "POST" | "PUT" | "DELETE" | "PATCH"} method - The HTTP method to use for the request.
 * @property {string} path - The API endpoint path, relative to the `baseUrl` (e.g., `"/command/get-profile"`).
 * @property {unknown} [body] - Optional. The request body payload. This can be a plain object (for JSON),
 * `FormData`, `Uint8Array`, `Blob`, or other `BodyInit` types.
 * @property {Headers} headers - An instance of `Headers` containing all HTTP headers for the request.
 * @property {string} [accessToken] - Optional. An access token specific to this request,
 * which will override the client's default `accessToken` if provided.
 */
export interface InternalRequestConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  body?: unknown;
  headers: Headers;
  accessToken?: string;
}

/**
 * A built-in middleware that logs detailed request and response information to the console
 * when debugging is enabled in the `PenpotClientConfig`.
 *
 * @internal
 * @constant {FetchMiddleware} debugMiddleware
 * @property {function(request: Request): Promise<Request>} onRequest - Intercepts outgoing requests to log method, URL, headers, and body.
 * @property {function(response: Response): Promise<Response>} onResponse - Intercepts incoming responses to log status, URL, headers, and body (JSON, text, or SSE stream).
 */
const debugMiddleware: FetchMiddleware = {
  /**
   * Intercepts outgoing requests to log method, URL, headers, and body content.
   * Special handling is included for `FormData` and general text/JSON bodies.
   *
   * @param {Request} req - The outgoing `Request` object.
   * @returns {Promise<Request>} A Promise that resolves with the original `Request` object.
   */
  onRequest: async (req) => {
    console.log(`\n[DEBUG] -> ${req.method} ${req.url}`);
    const headersObject: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      // Redact sensitive 'Cookie' header for security in logs.
      if (key.toLowerCase() === "cookie") {
        headersObject[key] = "auth-token=[REDACTED]";
      } else {
        headersObject[key] = value;
      }
    });
    console.log("[DEBUG] -> Headers:", headersObject);

    const reqClone = req.clone(); // Clone the request to safely read its body without consuming it.
    // Check for multipart/form-data content type, typically used for file uploads.
    if (reqClone.headers.get("content-type")?.includes("multipart/form-data")) {
      console.log("[DEBUG] -> Body: FormData");
      const formData = await reqClone.formData();
      // Iterate over FormData entries to log key-value pairs.
      formData.forEach((value, key) => {
        // FormData values can be either a string or a File (which is a Blob).
        if (typeof value === "string") {
          console.log(`[DEBUG] ->   ${key}: ${value}`);
        } else {
          // If value is a File, log its name and size.
          console.log(
            `[DEBUG] ->   ${key}: [File, name=${value.name}, size=${value.size}]`
          );
        }
      });
    } else if (reqClone.body) {
      // For other body types (e.g., JSON), attempt to read as text.
      try {
        const bodyText = await reqClone.text();
        console.log("[DEBUG] -> Body:", bodyText);
      } catch {
        // If reading as text fails, indicate that the body could not be logged.
        console.log("[DEBUG] -> Body: (Could not be logged)");
      }
    }

    return req;
  },
  /**
   * Intercepts incoming responses to log status, URL, headers, and body content.
   * Special handling is included for `text/event-stream` (SSE), JSON, and plain text responses.
   *
   * @param {Response} res - The incoming `Response` object.
   * @returns {Promise<Response>} A Promise that resolves with the original `Response` object.
   */
  onResponse: async (res) => {
    console.log(`[DEBUG] <- ${res.status} ${res.statusText} (${res.url})`);
    const headersObject: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headersObject[key] = value;
    });
    console.log("[DEBUG] <- Headers:", headersObject);

    const resClone = res.clone(); // Clone the response to safely read its body.
    try {
      const contentType = resClone.headers.get("content-type") ?? "";
      // Check for Server-Sent Events (SSE) content type.
      if (contentType.includes("text/event-stream")) {
        console.log("[DEBUG] <- Body (SSE Stream):");
        const reader = resClone.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            // Split SSE chunks by double newline and log each event block.
            chunk.split("\n\n").forEach((eventBlock) => {
              if (eventBlock.trim()) {
                console.log(
                  `[DEBUG] <-   ${eventBlock.replace(/\n/g, "\n[DEBUG] <-   ")}`
                );
              }
            });
          }
        }
      } else {
        // For other content types, attempt to parse as JSON first, then as plain text.
        const bodyText = await resClone.text();
        try {
          const jsonBody = JSON.parse(bodyText);
          console.log("[DEBUG] <- Body (JSON):", jsonBody);
        } catch (_e) {
          console.log("[DEBUG] <- Body (Text):", `"${bodyText}"`);
        }
      }
    } catch (_e) {
      // If reading the response body fails, indicate that it could not be logged.
      console.log("[DEBUG] <- Body: (Not readable as text)");
    }
    return res;
  },
};

/**
 * Converts a camelCase string to kebab-case.
 * This utility function is used internally for converting JavaScript object keys
 * to the kebab-case format often expected by HTTP headers or form data fields.
 *
 * @param {string} str - The camelCase string to convert (e.g., "projectId").
 * @returns {string} The kebab-cased string (e.g., "project-id").
 *
 * @example
 * ```typescript
 * const camelCaseString = "someCamelCaseString";
 * const kebabCaseString = camelToKebab(camelCaseString); // Returns "some-camel-case-string"
 * ```
 */
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * @internal
 * The core function for sending HTTP API requests to the Penpot backend.
 * This function orchestrates the entire request pipeline:
 * 1. Applies authentication and debug middleware.
 * 2. Processes the request body (e.g., converts objects to JSON, handles `FormData` for file uploads).
 * 3. Executes the `fetch` API call.
 * 4. Applies response middleware.
 * 5. Handles non-OK HTTP responses by throwing `ApiHttpError`.
 * 6. Parses the response body based on `Content-Type` (JSON, `ArrayBuffer`, SSE stream, or text).
 * 7. Catches and re-throws network errors as `ApiClientError`.
 *
 * @template T - The expected type of the successful response data.
 * @param {PenpotClientConfig} clientConfig - The global configuration for the Penpot client,
 * including `baseUrl`, `accessToken`, `middleware`, and `debug` settings.
 * @param {InternalRequestConfig} requestConfig - The specific configuration for the current request,
 * including `method`, `path`, `body`, `headers`, and an optional overriding `accessToken`.
 * @returns {Promise<T>} A Promise that resolves with the parsed response data of type `T` upon success.
 * @throws {ApiHttpError} If the HTTP response status is 400 or higher. The error will contain
 * the HTTP status, status text, and any parsed error details from the server.
 * @throws {ApiClientError} For network failures (e.g., `TypeError` from `fetch`), middleware errors,
 * or unexpected issues during stream processing.
 *
 * @example
 * ```typescript
 * import { sendRequest } from './client/_internals/request.ts';
 * import { PenpotClientConfig } from './index.ts';
 * import { ApiHttpError, ApiClientError } from './client/errors.ts';
 *
 * // Assume a basic client configuration
 * const config: PenpotClientConfig = {
 * baseUrl: '[https://design.penpot.app/api/rpc](https://design.penpot.app/api/rpc)',
 * accessToken: 'your_token',
 * debug: true // Enable debug logging for this example
 * };
 *
 * async function exampleSendRequest() {
 * try {
 * // Example 1: Send a POST request with JSON body (e.g., get user profile)
 * const userProfile = await sendRequest<{ id: string; fullname: string }>(config, {
 * method: 'POST',
 * path: '/command/get-profile',
 * body: {}, // Empty body for get-profile command
 * headers: new Headers({ 'Accept': 'application/json' })
 * });
 * console.log('Fetched user profile:', userProfile.fullname);
 *
 * // Example 2: Send a POST request with FormData (e.g., import a file)
 * // In a real scenario, `fileContent` would come from a file input or Deno.readFile
 * const fileContent = new Uint8Array([1, 2, 3, 4]); // Mock file content
 * const importResult = await sendRequest<{ fileId: string }>(config, {
 * method: 'POST',
 * path: '/command/import-binfile',
 * body: {
 * projectId: 'some-project-uuid',
 * name: 'my-design.penpot',
 * file: fileContent,
 * mimeType: 'application/octet-stream'
 * },
 * headers: new Headers() // Content-Type will be set automatically for FormData
 * });
 * console.log('Imported file ID:', importResult.fileId);
 *
 * // Example 3: Handling an expected HTTP error (e.g., 404 Not Found)
 * await sendRequest<any>(config, {
 * method: 'POST',
 * path: '/command/non-existent-command',
 * body: {},
 * headers: new Headers()
 * });
 *
 * } catch (error) {
 * if (error instanceof ApiHttpError) {
 * console.error(`API HTTP Error: ${error.status} ${error.statusText}`);
 * console.error('Server details:', error.details);
 * } else if (error instanceof ApiClientError) {
 * console.error(`Client-side Error: ${error.message}`);
 * console.error('Caused by:', error.cause);
 * } else {
 * console.error('An unexpected error occurred:', error);
 * }
 * }
 * }
 *
 * // Call the example function to see it in action
 * // exampleSendRequest();
 * ```
 */
export async function sendRequest<T>(
  clientConfig: PenpotClientConfig,
  requestConfig: InternalRequestConfig
): Promise<T> {
  const { baseUrl, accessToken, middleware = [], debug } = clientConfig;
  const {
    method,
    path,
    body: payload,
    headers: initialHeaders,
  } = requestConfig;

  // Construct the full URL for the request.
  const url = new URL(path, baseUrl);
  // Determine the final access token to use (request-specific overrides client-global).
  const finalAccessToken = requestConfig.accessToken ?? accessToken;

  let finalBody: BodyInit | undefined;
  const finalHeaders = new Headers(initialHeaders);

  // Check if the payload is intended for file upload (FormData).
  const isFileUpload =
    payload &&
    typeof payload === "object" &&
    "file" in payload &&
    (payload.file instanceof Uint8Array || payload.file instanceof Blob);

  if (isFileUpload) {
    // For file uploads, construct FormData.
    const formData = new FormData();
    // Destructure `file` and other parameters from the payload.
    const { file, ...params } = payload as {
      file: Uint8Array | Blob;
      [key: string]: unknown;
    };

    // Append all other parameters to FormData, converting keys to kebab-case.
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(camelToKebab(key), String(value));
      }
    });

    // Append the actual file content.
    formData.append(
      "file",
      new Blob([file]), // Wrap Uint8Array in Blob if necessary.
      String(params.name) || "untitled" // Use provided name or default.
    );

    finalBody = formData;
    // When using FormData, the browser automatically sets the correct 'Content-Type' header
    // with boundary, so we explicitly delete any pre-set 'Content-Type'.
    finalHeaders.delete("Content-Type");
  } else if (payload) {
    // For non-file payloads, assume JSON and stringify the body.
    finalBody = JSON.stringify(payload);
    // Ensure 'Content-Type: application/json' is set if not already present.
    if (!finalHeaders.has("Content-Type")) {
      finalHeaders.set("Content-Type", "application/json");
    }
  }

  // Create the initial Request object.
  let request = new Request(url, {
    method,
    headers: finalHeaders,
    body: finalBody,
  });

  // Define a built-in authentication middleware to inject the access token as a cookie.
  const authMiddleware: FetchMiddleware = {
    onRequest: (req) => {
      if (finalAccessToken) {
        const newHeaders = new Headers(req.headers);
        newHeaders.set("Cookie", `auth-token=${finalAccessToken}`);
        return new Request(req, { headers: newHeaders });
      }
      return req;
    },
  };

  // Assemble all middleware: built-in auth, optional debug, and user-provided middleware.
  const allMiddleware = [
    authMiddleware,
    ...(debug ? [debugMiddleware] : []), // Conditionally include debug middleware.
    ...middleware, // User-defined middleware.
  ];

  // Execute `onRequest` middleware sequentially.
  try {
    for (const mw of allMiddleware) {
      if (mw.onRequest) {
        request = await mw.onRequest(request);
      }
    }
  } catch (error) {
    // If any `onRequest` middleware throws an error, wrap it in `ApiClientError` and re-throw.
    throw new ApiClientError("Middleware `onRequest` error", { cause: error });
  }

  let response: Response;
  // Execute the actual `fetch` call.
  try {
    response = await fetch(request);
  } catch (error) {
    // Catch network-level errors (e.g., `TypeError` for connection issues) and re-throw as `ApiClientError`.
    throw new ApiClientError("Network request failed", { cause: error });
  }

  // Execute `onResponse` middleware in reverse order.
  try {
    // Iterate backwards to ensure `onResponse` middleware runs from last-registered to first-registered.
    for (let i = allMiddleware.length - 1; i >= 0; i--) {
      const mw = allMiddleware[i];
      if (mw.onResponse) {
        response = await mw.onResponse(response);
      }
    }
  } catch (error) {
    // If any `onResponse` middleware throws an error, wrap it in `ApiClientError` and re-throw.
    throw new ApiClientError("Middleware `onResponse` error", { cause: error });
  }

  // Check if the HTTP response was successful (status 2xx).
  if (!response.ok) {
    let errorDetails: unknown;
    try {
      // Attempt to parse error response as JSON.
      errorDetails = await response.json();
    } catch {
      // If JSON parsing fails, read as plain text.
      errorDetails = await response.text();
    }
    // Throw `ApiHttpError` for non-successful HTTP responses.
    throw new ApiHttpError(response, errorDetails);
  }

  // Determine content type for successful response parsing.
  const contentType = response.headers.get("content-type") ?? "";

  // Parse response based on Content-Type header.
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  if (contentType.includes("application/octet-stream")) {
    return (await response.arrayBuffer()) as T;
  }

  if (contentType.includes("text/event-stream")) {
    // Delegate SSE stream parsing to a dedicated handler.
    return handleSseResponse<T>(response);
  }

  // Default to parsing as plain text if no specific content type handler matches.
  return (await response.text()) as T;
}
