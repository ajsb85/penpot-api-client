import {
  createParser,
  type ParsedEvent,
  type ReconnectInterval,
} from "eventsource-parser";
import { ApiClientError } from "../errors.ts";

/**
 * @internal
 * Handles a `fetch` response that is a Server-Sent Events (SSE) stream.
 * It uses `eventsource-parser` to reliably parse the stream and extracts
 * the final data from the 'end' event, as expected from the Penpot API.
 *
 * @param response The `Response` object from a fetch call.
 * @returns A promise that resolves with the data from the final SSE event.
 * @throws {ApiClientError} if the stream ends without the expected data or if an error occurs.
 */
export function handleSseResponse<T>(response: Response): Promise<T> {
  if (!response.body) {
    return Promise.reject(new ApiClientError("SSE response body is null."));
  }

  return new Promise<T>((resolve, reject) => {
    const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
      // We only care about the final 'end' event which contains the result.
      if (event.type === "event" && event.event === "end" && event.data) {
        try {
          const parsedArray = JSON.parse(event.data);

          // The successful payload is a JSON array like: ["~u<uuid-string>"]
          if (
            Array.isArray(parsedArray) && parsedArray.length > 0 &&
            typeof parsedArray[0] === "string"
          ) {
            const taggedId = parsedArray[0];

            // The ID is prefixed with "~u". We need to strip it.
            if (taggedId.startsWith("~u")) {
              const fileId = taggedId.substring(2);
              // Resolve with the object shape the client expects for this call.
              resolve({ fileId } as T);
              return; // Success, stop processing.
            }
          }

          reject(
            new ApiClientError(
              `Unexpected SSE 'end' event data format: ${event.data}`,
            ),
          );
        } catch (e) {
          reject(
            new ApiClientError(
              `Failed to parse SSE 'end' event data: ${event.data}`,
              { cause: e },
            ),
          );
        }
      } else if (
        event.type === "event" && event.event === "error" && event.data
      ) {
        // Handle explicit error events from the server
        try {
          const errorData = JSON.parse(event.data);
          reject(
            new ApiClientError("Server sent an error event in the SSE stream", {
              cause: errorData,
            }),
          );
        } catch (_e) {
          reject(
            new ApiClientError(
              "Server sent an unparsable error event in the SSE stream",
              { cause: event.data },
            ),
          );
        }
      }
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            reject(
              new ApiClientError(
                "SSE stream ended unexpectedly without a valid 'end' event containing the file ID.",
              ),
            );
            break;
          }
          parser.feed(decoder.decode(value, { stream: true }));
        }
      } catch (error) {
        reject(
          new ApiClientError("Error while reading SSE stream.", {
            cause: error,
          }),
        );
      }
    };

    processStream();
  });
}
