/// <reference lib="deno.ns" />
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "jsr:@std/testing@1.0.14/bdd";
import { type Spy, type Stub, stub } from "jsr:@std/testing@1.0.14/mock";
import { assertEquals, assertInstanceOf, assertRejects } from "jsr:@std/assert";
import { sendRequest } from "../client/_internals/request.ts";
import { ApiClientError, ApiHttpError } from "../client/errors.ts";
import type { PenpotClientConfig } from "../index.ts";

// Mock the global fetch function
let fetchStub: Stub<typeof globalThis, [input: RequestInfo | URL, init?: RequestInit | undefined], Promise<Response>>;

describe("sendRequest", () => {
  const baseClientConfig: PenpotClientConfig = {
    baseUrl: "https://testing.penpot.app",
    accessToken: "test-token",
  };

  beforeEach(() => {
    // Stub fetch before each test and restore it after.
    // This prevents tests from interfering with each other.
    fetchStub = stub(globalThis, "fetch", () =>
      Promise.resolve(new Response(null, { status: 204 }))
    );
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it("should send a basic JSON request and parse the response", async () => {
    const mockData = { id: "123", name: "Test" };
    fetchStub.restore(); // Restore default stub
    fetchStub = stub(globalThis, "fetch", () =>
      Promise.resolve(
        new Response(JSON.stringify(mockData), {
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    const result = await sendRequest(baseClientConfig, {
      method: "POST",
      path: "/api/rpc/command/get-profile",
      headers: new Headers(),
    });

    assertEquals(result, mockData);
    const request = fetchStub.calls[0].args[0] as Request;
    assertEquals(request.method, "POST");
    assertEquals(
      request.url,
      "https://testing.penpot.app/api/rpc/command/get-profile"
    );
    assertEquals(request.headers.get("Cookie"), "auth-token=test-token");
  });

  it("should handle ArrayBuffer responses correctly", async () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    fetchStub.restore();
    fetchStub = stub(globalThis, "fetch", () =>
      Promise.resolve(
        new Response(buffer, {
          headers: { "Content-Type": "application/octet-stream" },
        })
      )
    );

    const result = await sendRequest<ArrayBuffer>(baseClientConfig, {
      method: "POST",
      path: "/api/rpc/command/export-binfile",
      headers: new Headers(),
    });

    assertInstanceOf(result, ArrayBuffer);
    assertEquals(new Uint8Array(result), new Uint8Array([1, 2, 3]));
  });

  it("should throw ApiHttpError for non-ok responses", async () => {
    const errorDetails = { code: "not-found" };
    fetchStub.restore();
    fetchStub = stub(globalThis, "fetch", () =>
      Promise.resolve(
        new Response(JSON.stringify(errorDetails), {
          status: 404,
          statusText: "Not Found",
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    const error = await assertRejects(
      () =>
        sendRequest(baseClientConfig, {
          method: "GET",
          path: "/bad-path",
          headers: new Headers(),
        }),
      ApiHttpError
    );
    assertEquals(error.status, 404);
    assertEquals(error.details, errorDetails);
  });

  it("should throw ApiClientError for network failures", async () => {
    const networkError = new TypeError("Failed to fetch");
    fetchStub.restore();
    fetchStub = stub(globalThis, "fetch", () => Promise.reject(networkError));

    const error = await assertRejects(
      () =>
        sendRequest(baseClientConfig, {
          method: "GET",
          path: "/net-error",
          headers: new Headers(),
        }),
      ApiClientError
    );
    assertEquals(error.message, "Network request failed");
    assertEquals(error.cause, networkError);
  });

  it("should correctly apply custom middleware", async () => {
    fetchStub.restore();
    fetchStub = stub(globalThis, "fetch", () =>
      Promise.resolve(
        new Response("{}", { headers: { "Content-Type": "application/json" } })
      )
    );

    const onRequestSpy = spy((req: Request) => {
      const newHeaders = new Headers(req.headers);
      newHeaders.set("X-Custom-Header", "middleware-was-here");
      return new Request(req, { headers: newHeaders });
    });

    const onResponseSpy = spy((res: Response) => res);

    const clientConfigWithMiddleware: PenpotClientConfig = {
      ...baseClientConfig,
      middleware: [
        {
          onRequest: onRequestSpy,
          onResponse: onResponseSpy,
        },
      ],
    };

    await sendRequest(clientConfigWithMiddleware, {
      method: "POST",
      path: "/middleware-test",
      headers: new Headers(),
    });

    assertEquals(onRequestSpy.calls.length, 1);
    assertEquals(onResponseSpy.calls.length, 1);

    const finalRequest = fetchStub.calls[0].args[0] as Request;
    assertEquals(
      finalRequest.headers.get("X-Custom-Header"),
      "middleware-was-here"
    );
  });
});
