import {
  createParser,
  type ParsedEvent,
  type ReconnectInterval,
} from "eventsource-parser";
import { ApiClientError } from "../errors.ts";

/**
 * @file This module provides a specialized utility function, `handleSseResponse`,
 * designed to process Server-Sent Events (SSE) streams originating from the Penpot API.
 * It leverages the `eventsource-parser` library to robustly parse the incoming stream
 * and extract specific data payloads, particularly the final result from an 'end' event.
 *
 * @remarks
 * Server-Sent Events are a lightweight, unidirectional protocol for pushing real-time
 * updates from a server to a client over a single HTTP connection. Penpot utilizes SSE
 * for long-running operations such as file imports (`import-binfile`) and exports,
 * providing progress updates and delivering the final result upon completion.
 *
 * This function specifically listens for:
 * - `event: end`: Signifies the successful completion of the operation, carrying the final result (e.g., the new file ID).
 * - `event: error`: Indicates an explicit error message sent by the server within the SSE stream.
 * - Any other events (e.g., `progress` events) are typically ignored by this handler,
 * as its primary focus is on the terminal 'end' or 'error' states.
 *
 * The `eventsource-parser` library is used to handle common SSE complexities like
 * partial event reception, reconnection logic (though not directly managed by this function's Promise),
 * and proper parsing of `data`, `event`, and `id` fields.
 *
 * @packageDocumentation
 */

/**
 * @internal
 * Handles a `fetch` API `Response` object that is expected to be a Server-Sent Events (SSE) stream.
 * This function processes the stream using `eventsource-parser` to extract structured data,
 * primarily looking for a final 'end' event containing the operation's result (e.g., a file ID).
 * It also handles explicit 'error' events sent by the server within the stream.
 *
 * @template T - The expected type of the data payload contained within the final 'end' event.
 * For Penpot's file import, this is typically `{ fileId: Uuid }`.
 *
 * @param {Response} response - The `Response` object obtained from a `fetch` call,
 * which is expected to have a `Content-Type` of `text/event-stream`.
 * @returns {Promise<T>} A Promise that resolves with the data of type `T` extracted from the
 * final 'end' event of the SSE stream upon successful completion.
 * @throws {ApiClientError} If:
 * - The `response.body` is `null` (indicating no stream content).
 * - The SSE stream ends unexpectedly without a valid 'end' event.
 * - The 'end' event's `data` payload is malformed (not valid JSON).
 * - The 'end' event's `data` is valid JSON but does not conform to the expected `["~u<uuid-string>"]` format.
 * - The server explicitly sends an `event: error` within the stream.
 * - Any other error occurs during stream reading or parsing.
 *
 * @example
 * ```typescript
 * import { handleSseResponse } from './client/_internals/sse.ts';
 * import { ApiClientError } from './client/errors.ts';
 *
 * // Example: Simulating a successful SSE import stream
 * async function simulateSuccessfulImport() {
 * const mockStreamContent = `
 * event: progress
 * data: {"~:section":"~:manifest","~:progress":0.1}
 *
 * event: progress
 * data: {"~:section":"~:file","~:name":"MyDesign.penpot","~:progress":0.5}
 *
 * event: end
 * data: ["~ua03ea8b8-fc8a-8124-8006-7c45ed7029cf"]
 *
 * `;
 * const mockResponse = new Response(new TextEncoder().encode(mockStreamContent), {
 * headers: { 'Content-Type': 'text/event-stream' }
 * });
 *
 * try {
 * // Expected type for this example is { fileId: string }
 * const result = await handleSseResponse<{ fileId: string }>(mockResponse);
 * console.log('Successfully imported file with ID:', result.fileId); // Output: a03ea8b8-fc8a-8124-8006-7c45ed7029cf
 * } catch (error) {
 * console.error('Import failed:', error);
 * }
 * }
 *
 * // Example: Simulating an SSE stream ending unexpectedly
 * async function simulateUnexpectedStreamEnd() {
 * const mockStreamContent = `
 * event: progress
 * data: {"~:section":"~:manifest"}
 *
 * event: progress
 * data: {"~:section":"~:file"}
 *
 * `; // Stream ends without 'end' event
 * const mockResponse = new Response(new TextEncoder().encode(mockStreamContent), {
 * headers: { 'Content-Type': 'text/event-stream' }
 * });
 *
 * try {
 * await handleSseResponse<{ fileId: string }>(mockResponse);
 * } catch (error) {
 * if (error instanceof ApiClientError) {
 * console.error('Caught expected error:', error.message); // Output: SSE stream ended unexpectedly...
 * }
 * }
 * }
 *
 * // Example: Simulating an explicit error event from the server
 * async function simulateServerErrorEvent() {
 * const errorPayload = {
 * "~:type": "~:validation",
 * "~:code": "~:invalid-penpot-file",
 * "~:hint": "The provided .penpot file is invalid or corrupted.",
 * };
 * const mockStreamContent = `
 * event: error
 * data: ${JSON.stringify(errorPayload)}
 *
 * `;
 * const mockResponse = new Response(new TextEncoder().encode(mockStreamContent), {
 * headers: { 'Content-Type': 'text/event-stream' }
 * });
 *
 * try {
 * await handleSseResponse<{ fileId: string }>(mockResponse);
 * } catch (error) {
 * if (error instanceof ApiClientError) {
 * console.error('Caught expected server error from SSE:', error.message);
 * console.error('Server error details (cause):', error.cause); // Output: { "~:type": "~:validation", ... }
 * }
 * }
 * }
 *
 * // Uncomment to run examples:
 * // simulateSuccessfulImport();
 * // simulateUnexpectedStreamEnd();
 * // simulateServerErrorEvent();
 * ```
 */
export function handleSseResponse<T>(response: Response): Promise<T> {
  // Ensure the response body is not null before proceeding to read the stream.
  if (!response.body) {
    return Promise.reject(new ApiClientError("SSE response body is null."));
  }

  // Return a new Promise to handle the asynchronous stream processing.
  return new Promise<T>((resolve, reject) => {
    // Create an EventSource parser. This library handles buffering and parsing
    // of SSE messages (data, event, id, retry fields).
    const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
      // Check if the parsed event is a standard SSE event (not a reconnect interval).
      if (event.type === "event") {
        // Primary case: Handle the 'end' event, which signals successful completion
        // and carries the final result data.
        if (event.event === "end" && event.data) {
          try {
            // Attempt to parse the data field as JSON.
            const parsedArray = JSON.parse(event.data);

            // Penpot's successful 'end' event payload is typically a JSON array
            // containing a single string prefixed with "~u" for UUIDs (e.g., ["~u<uuid-string>"]).
            if (
              Array.isArray(parsedArray) &&
              parsedArray.length > 0 &&
              typeof parsedArray[0] === "string"
            ) {
              const taggedId = parsedArray[0];

              // Extract the actual UUID by stripping the "~u" prefix.
              if (taggedId.startsWith("~u")) {
                const fileId = taggedId.substring(2);
                // Resolve the Promise with the extracted file ID, cast to the expected type T.
                resolve({ fileId } as T);
                return; // Operation successful, no further stream processing needed for this Promise.
              }
            }

            // If the 'end' event data is valid JSON but doesn't match the expected format.
            reject(
              new ApiClientError(
                `Unexpected SSE 'end' event data format: ${event.data}`
              )
            );
          } catch (e) {
            // If JSON parsing of the 'end' event data fails.
            reject(
              new ApiClientError(
                `Failed to parse SSE 'end' event data: ${event.data}`,
                { cause: e }
              )
            );
          }
        } else if (event.event === "error" && event.data) {
          // Handle explicit 'error' events sent by the server within the SSE stream.
          try {
            // Parse the error data from the server.
            const errorData = JSON.parse(event.data);
            reject(
              new ApiClientError(
                "Server sent an error event in the SSE stream",
                {
                  cause: errorData, // Attach the server's error data as the cause.
                }
              )
            );
          } catch (_e) {
            // If the server's error event data is unparsable.
            reject(
              new ApiClientError(
                "Server sent an unparsable error event in the SSE stream",
                { cause: event.data }
              )
            );
          }
        }
        // Other event types (e.g., "progress") are ignored by this handler,
        // as they typically represent intermediate states and not the final result or error.
      }
    });

    // Obtain a ReadableStreamDefaultReader to read the response body chunk by chunk.
    const reader = response.body!.getReader();
    // Initialize a TextDecoder to convert Uint8Array chunks to strings.
    const decoder = new TextDecoder();

    /**
     * Recursively processes the incoming stream chunks.
     * @returns {Promise<void>}
     */
    const processStream = async () => {
      try {
        // Loop indefinitely until the stream is done or an error/resolution occurs.
        while (true) {
          // Read the next chunk from the stream.
          const { done, value } = await reader.read();
          if (done) {
            // If the stream ends unexpectedly (without an 'end' event), reject the Promise.
            reject(
              new ApiClientError(
                "SSE stream ended unexpectedly without a valid 'end' event containing the file ID."
              )
            );
            break; // Exit the loop.
          }
          // Decode the chunk and feed it to the SSE parser.
          // The `stream: true` option indicates that more data may follow.
          parser.feed(decoder.decode(value, { stream: true }));
        }
      } catch (error) {
        // Catch any errors that occur during stream reading (e.g., network issues).
        reject(
          new ApiClientError("Error while reading SSE stream.", {
            cause: error,
          })
        );
      }
    };

    // Start processing the stream.
    processStream();
  });
}
