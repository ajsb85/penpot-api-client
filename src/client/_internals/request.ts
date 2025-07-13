import { ApiClientError, ApiHttpError } from "../errors.ts";
import { handleSseResponse } from "./sse.ts";
import type { PenpotClientConfig } from "../../index.ts";
import type { FetchMiddleware } from "./middleware.ts";

/**
 * @internal
 * The internal configuration for a single request.
 */
export interface InternalRequestConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  body?: unknown;
  headers: Headers;
  accessToken?: string;
}

/**
 * A middleware that logs request and response details if debugging is enabled.
 * @internal
 */
const debugMiddleware: FetchMiddleware = {
  onRequest: async (req) => {
    console.log(`\n[DEBUG] -> ${req.method} ${req.url}`);
    const headersObject: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (key.toLowerCase() === "cookie") {
        headersObject[key] = "auth-token=[REDACTED]";
      } else {
        headersObject[key] = value;
      }
    });
    console.log("[DEBUG] -> Headers:", headersObject);

    const reqClone = req.clone();
    if (reqClone.headers.get("content-type")?.includes("multipart/form-data")) {
      console.log("[DEBUG] -> Body: FormData");
      const formData = await reqClone.formData();
      // Use .forEach for maximum compatibility with FormData implementations.
      formData.forEach((value, key) => {
        // FormData values can be either a string or a File (which is a Blob).
        if (typeof value === "string") {
          console.log(`[DEBUG] ->   ${key}: ${value}`);
        } else {
          // After the type check, TypeScript knows `value` is a File.
          console.log(
            `[DEBUG] ->   ${key}: [File, name=${value.name}, size=${value.size}]`,
          );
        }
      });
    } else if (reqClone.body) {
      try {
        const bodyText = await reqClone.text();
        console.log("[DEBUG] -> Body:", bodyText);
      } catch {
        console.log("[DEBUG] -> Body: (Could not be logged)");
      }
    }

    return req;
  },
  onResponse: async (res) => {
    console.log(`[DEBUG] <- ${res.status} ${res.statusText} (${res.url})`);
    const headersObject: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headersObject[key] = value;
    });
    console.log("[DEBUG] <- Headers:", headersObject);

    const resClone = res.clone();
    try {
      const contentType = resClone.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        console.log("[DEBUG] <- Body (SSE Stream):");
        const reader = resClone.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            chunk.split("\n\n").forEach((eventBlock) => {
              if (eventBlock.trim()) {
                console.log(
                  `[DEBUG] <-   ${
                    eventBlock.replace(/\n/g, "\n[DEBUG] <-   ")
                  }`,
                );
              }
            });
          }
        }
      } else {
        const bodyText = await resClone.text();
        try {
          const jsonBody = JSON.parse(bodyText);
          console.log("[DEBUG] <- Body (JSON):", jsonBody);
        } catch (_e) {
          console.log("[DEBUG] <- Body (Text):", `"${bodyText}"`);
        }
      }
    } catch (_e) {
      console.log("[DEBUG] <- Body: (Not readable as text)");
    }
    return res;
  },
};

/**
 * Converts a camelCase string to kebab-case.
 * @param str The string to convert.
 * @returns The kebab-cased string.
 */
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * @internal
 * The core function for sending API requests. It orchestrates middleware,
 * the fetch call, response parsing, and error handling.
 *
 * @param clientConfig The global configuration for the Penpot client.
 * @param requestConfig The configuration for this specific request.
 * @returns A promise that resolves with the parsed response data.
 * @throws {ApiError} If the request fails at any stage.
 */
export async function sendRequest<T>(
  clientConfig: PenpotClientConfig,
  requestConfig: InternalRequestConfig,
): Promise<T> {
  const { baseUrl, accessToken, middleware = [], debug } = clientConfig;
  const {
    method,
    path,
    body: payload,
    headers: initialHeaders,
  } = requestConfig;

  const url = new URL(path, baseUrl);
  const finalAccessToken = requestConfig.accessToken ?? accessToken;

  let finalBody: BodyInit | undefined;
  const finalHeaders = new Headers(initialHeaders);

  const isFileUpload = payload &&
    typeof payload === "object" &&
    "file" in payload &&
    (payload.file instanceof Uint8Array || payload.file instanceof Blob);

  if (isFileUpload) {
    const formData = new FormData();
    const { file, ...params } = payload as {
      file: Uint8Array | Blob;
      [key: string]: unknown;
    };

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(camelToKebab(key), String(value));
      }
    });

    formData.append(
      "file",
      new Blob([file]),
      String(params.name) || "untitled",
    );

    finalBody = formData;
    finalHeaders.delete("Content-Type");
  } else if (payload) {
    finalBody = JSON.stringify(payload);
    if (!finalHeaders.has("Content-Type")) {
      finalHeaders.set("Content-Type", "application/json");
    }
  }

  let request = new Request(url, {
    method,
    headers: finalHeaders,
    body: finalBody,
  });

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

  const allMiddleware = [
    authMiddleware,
    ...(debug ? [debugMiddleware] : []),
    ...middleware,
  ];

  try {
    for (const mw of allMiddleware) {
      if (mw.onRequest) {
        request = await mw.onRequest(request);
      }
    }
  } catch (error) {
    throw new ApiClientError("Middleware `onRequest` error", { cause: error });
  }

  let response: Response;
  try {
    response = await fetch(request);
  } catch (error) {
    throw new ApiClientError("Network request failed", { cause: error });
  }

  try {
    for (let i = allMiddleware.length - 1; i >= 0; i--) {
      const mw = allMiddleware[i];
      if (mw.onResponse) {
        response = await mw.onResponse(response);
      }
    }
  } catch (error) {
    throw new ApiClientError("Middleware `onResponse` error", { cause: error });
  }

  if (!response.ok) {
    let errorDetails: unknown;
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = await response.text();
    }
    throw new ApiHttpError(response, errorDetails);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  if (contentType.includes("application/octet-stream")) {
    return (await response.arrayBuffer()) as T;
  }

  if (contentType.includes("text/event-stream")) {
    return handleSseResponse<T>(response);
  }

  return (await response.text()) as T;
}
