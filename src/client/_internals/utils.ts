// src/client/_internals/utils.ts

import { ApiClientError, AuthenticationError } from "./errors.ts";
import type { UUID as _UUID } from "../generated/types.ts";

/**
 * Helper to convert a Transit JSON array-map into a plain JavaScript object.
 * Transit array-maps look like: ["^ ", "~:key1", "value1", "~:key2", "value2", ...].
 * This function converts them to: { "~:key1": "value1", "~:key2": "value2", ... }.
 * @param transitArray The array representing the Transit map.
 * @returns A plain JavaScript object.
 * @throws {Error} if the input array is not a valid Transit array-map.
 */
function parseTransitArrayMap<T extends Record<string, unknown>>(transitArray: unknown[]): T {
  if (!Array.isArray(transitArray) || transitArray[0] !== "^ ") {
    // If it's not a Transit array-map, but it's an object, we assume it's already in the desired T format.
    // Perform a two-step assertion to satisfy TypeScript's strictness.
    if (typeof transitArray === 'object' && transitArray !== null) {
      return (transitArray as unknown) as T; // <-- CRITICAL FIX: Cast to unknown first
    }
    throw new ApiClientError("Unexpected Transit array-map format.");
  }

  const obj: Record<string, unknown> = {};
  for (let i = 1; i < transitArray.length; i += 2) {
    const key = transitArray[i];
    const value = transitArray[i + 1];
    if (typeof key === 'string') {
      obj[key] = value;
    } else {
      console.warn("Non-string key encountered in Transit array-map:", key);
    }
  }
  return obj as T;
}

/**
 * Parses a Server-Sent Events (SSE) stream and returns the final data.
 * ... (rest of parseSseStream remains the same) ...
 */
export async function parseSseStream<T>(response: Response): Promise<T> {
  let resultData: T | undefined;
  const reader = response.body?.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  if (!reader) {
    throw new ApiClientError("Failed to get readable stream for SSE.");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("SSE stream finished.");
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.substring(6);
          try {
            if (data.startsWith('["~u')) {
              const parsedArray = JSON.parse(data);
              const fileIdWithPrefix = parsedArray[0];
              if (
                typeof fileIdWithPrefix === "string" &&
                fileIdWithPrefix.startsWith("~u")
              ) {
                resultData = { fileId: fileIdWithPrefix.substring(2) } as T;
              } else {
                console.warn(
                  "Could not extract UUID from SSE 'end' data:",
                  data
                );
              }
            }
          } catch (e) {
            console.warn(
              "Failed to parse SSE data line as JSON/Transit:",
              line,
              e
            );
          }
        }
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new ApiClientError(`Error reading SSE stream: ${error.message}`);
    } else {
      throw new ApiClientError(`Unknown error reading SSE stream: ${error}`);
    }
  }

  if (resultData) {
    return resultData;
  } else {
    throw new ApiClientError(
      "SSE stream finished, but no valid result data was received."
    );
  }
}

/**
 * Generic request handler for the Penpot API.
 * Now uses auth-token from Cookie header for authentication.
 * @param baseUrl The base URL of the Penpot API.
 * @param path The API endpoint path.
 * @param method The HTTP method.
 * @param body The request body.
 * @param contentType The Content-Type header.
 * @param additionalHeaders Any extra headers.
 * @param authToken The auth-token string (from a browser session).
 * @returns A Promise that resolves with the parsed response data.
 * @throws {ApiClientError} For API errors or network issues.
 * @throws {AuthenticationError} For 401 authentication errors.
 */
export async function request<T>(
  baseUrl: string,
  path: string,
  method: string,
  body?: BodyInit | Record<string, unknown>,
  contentType: string = "application/json",
  additionalHeaders: HeadersInit = {},
  authToken?: string // Renamed from personalAccessToken to authToken to match Cookie usage
): Promise<T> {
  const headers = new Headers(additionalHeaders);

  let processedBody: BodyInit | undefined;

  if (body instanceof FormData) {
    processedBody = body;
  } else if (typeof body === "object" && body !== null) {
    processedBody = JSON.stringify(body);
    headers.set("Content-Type", contentType);
  } else {
    processedBody = body as BodyInit | undefined;
    if (processedBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", contentType);
    }
  }

  // --- CRITICAL FIX: Use Cookie header for auth-token ---
  if (authToken) {
    headers.set("Cookie", `auth-token=${authToken}`);
  }
  // --- Removed Authorization: Bearer header as it was not working for commands ---

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: processedBody,
    credentials: "omit", // Explicitly omit credentials, as we manage the 'auth-token' manually
  });

  if (!response.ok) {
    let errorDetails: unknown;
    try {
      errorDetails = await response.json();
    } catch (_e) {
      errorDetails = response.statusText;
    }

    const errorMessage = `API call to ${path} failed with status ${response.status}.`;
    if (response.status === 401) {
      throw new AuthenticationError(
        errorMessage,
        response.status,
        errorDetails
      );
    } else {
      throw new ApiClientError(errorMessage, response.status, errorDetails);
    }
  }

  const responseContentType = response.headers.get("content-type") || "";

  if (path === "/command/export-binfile") {
    return response.arrayBuffer() as T;
  }

  if (
    path === "/command/import-binfile" &&
    responseContentType.includes("text/event-stream")
  ) {
    return await parseSseStream<T>(response);
  }

  // Check if it's a Transit array-map for login, and parse it.
  if (
    path === "/command/login-with-password" &&
    responseContentType.includes("application/transit+json")
  ) {
    const rawResponseArray = await response.json();
    return parseTransitArrayMap(rawResponseArray) as T;
  }

  return response.json() as T;
}
