/// <reference lib="deno.ns" />
import {
  describe,
  it,
  beforeEach,
  afterEach,
} from "jsr:@std/testing@1.0.14/bdd";
import { type Spy as _Spy, type Stub, stub } from "jsr:@std/testing@1.0.14/mock";
import { assertEquals, assertInstanceOf } from "jsr:@std/assert";
import { PenpotClient } from "../index.ts";
import { ApiHttpError } from "../client/errors.ts";
import type { paths } from "../client/generated/types.ts";

describe("PenpotClient Integration", () => {
  const client = new PenpotClient({
    baseUrl: "https://mock.penpot.app",
    accessToken: "client-token",
  });

  // We use a stub to replace the global fetch for each test.
  let fetchStub: Stub<typeof globalThis, [input: RequestInfo | URL, init?: RequestInit | undefined], Promise<Response>>;

  beforeEach(() => {
    // Default stub before each test to avoid leakage.
    // Specific tests will override this with their required mock responses.
    fetchStub = stub(globalThis, "fetch", () =>
      Promise.resolve(new Response(null, { status: 204 }))
    );
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it("should successfully execute a request and return data", async () => {
    const mockProfile: paths["/command/get-profile"]["post"]["responses"]["default"]["content"]["application/json"] =
      {
        id: "user-123",
        fullname: "Test User",
        email: "test@example.com",
      };

    // Configure the stub for this specific test case
    fetchStub.restore();
    fetchStub = stub(globalThis, "fetch", () =>
      Promise.resolve(
        new Response(JSON.stringify(mockProfile), {
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    const { data, error } = await client.auth.getProfile().exec();

    assertEquals(error, null);
    assertEquals(data, mockProfile);

    const request = fetchStub.calls[0].args[0] as Request;
    assertEquals(
      request.url,
      "https://mock.penpot.app/api/rpc/command/get-profile"
    );
    assertEquals(request.headers.get("Cookie"), "auth-token=client-token");
  });

  it("should correctly handle an API error and return an error object", async () => {
    const errorDetails = { code: "object-not-found" };
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

    const { data, error } = await client.files
      .getFile({ id: "non-existent-id" })
      .exec();

    assertEquals(data, null);
    assertInstanceOf(error, ApiHttpError);
    assertEquals(error?.status, 404);
    assertEquals(error?.details, errorDetails);
  });

  it("should allow overriding the token for a single request", async () => {
    const mockData = { success: true };
    fetchStub.restore();
    fetchStub = stub(globalThis, "fetch", () =>
      Promise.resolve(
        new Response(JSON.stringify(mockData), {
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await client.auth.logout().withToken("override-for-logout").exec();

    const request = fetchStub.calls[0].args[0] as Request;
    assertEquals(
      request.headers.get("Cookie"),
      "auth-token=override-for-logout"
    );
  });
});
