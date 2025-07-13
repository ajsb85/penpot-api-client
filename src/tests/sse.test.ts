/// <reference lib="deno.ns" />
import { describe, it } from "jsr:@std/testing@1.0.14/bdd";
import { assertEquals, assertRejects } from "jsr:@std/assert";
import { handleSseResponse } from "../client/_internals/sse.ts";
import { ApiClientError } from "../client/errors.ts";

function createMockSseResponse(streamContent: string): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(streamContent));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("handleSseResponse", () => {
  it("should correctly parse a valid stream and extract the fileId", async () => {
    const mockStream = `
event: progress
data: {"~:section":"~:manifest"}

event: progress
data: {"~:section":"~:file","~:name":"New File 9"}

event: end
data: ["~ua03ea8b8-fc8a-8124-8006-7c45ed7029cf"]

`;
    const response = createMockSseResponse(mockStream);
    const result = await handleSseResponse<{ fileId: string }>(response);
    assertEquals(result, { fileId: "a03ea8b8-fc8a-8124-8006-7c45ed7029cf" });
  });

  it("should reject if the stream ends without an 'end' event", async () => {
    const mockStream = `
event: progress
data: {"~:section":"~:manifest"}
`;
    const response = createMockSseResponse(mockStream);
    await assertRejects(
      () => handleSseResponse(response),
      ApiClientError,
      "SSE stream ended unexpectedly without a valid 'end' event containing the file ID."
    );
  });

  it("should reject if the 'end' event has malformed data", async () => {
    const mockStream = `
event: end
data: this is not json
`;
    const response = createMockSseResponse(mockStream);
    await assertRejects(
      () => handleSseResponse(response),
      ApiClientError,
      "Failed to parse SSE 'end' event data: this is not json"
    );
  });

  it("should reject if the 'end' event data is not in the expected format", async () => {
    const mockStream = `
event: end
data: {"someOtherKey": "someValue"}
`;
    const response = createMockSseResponse(mockStream);
    await assertRejects(
      () => handleSseResponse(response),
      ApiClientError,
      'Unexpected SSE \'end\' event data format: {"someOtherKey": "someValue"}'
    );
  });

  it("should reject if the server sends an 'error' event", async () => {
    const errorPayload = {
      "~:type": "~:validation",
      "~:code": "~:invalid-penpot-file",
      "~:hint": "invalid penpot file",
    };
    const mockStream = `
event: error
data: ${JSON.stringify(errorPayload)}
`;
    const response = createMockSseResponse(mockStream);

    const error = await assertRejects(
      () => handleSseResponse(response),
      ApiClientError,
      "Server sent an error event in the SSE stream"
    );
    assertEquals((error as ApiClientError).cause, errorPayload);
  });
});
