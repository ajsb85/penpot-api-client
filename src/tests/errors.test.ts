/// <reference lib="deno.ns" />
import { describe, it } from "jsr:@std/testing@1.0.14/bdd";
import { assertEquals, assertInstanceOf } from "jsr:@std/assert";
import { ApiClientError, ApiHttpError } from "../client/errors.ts";

describe("Custom Error Classes", () => {
  describe("ApiHttpError", () => {
    it("should correctly construct with a Response object and details", () => {
      const mockResponse = new Response(JSON.stringify({ code: "not-found" }), {
        status: 404,
        statusText: "Not Found",
      });
      const errorDetails = { code: "not-found" };
      const error = new ApiHttpError(mockResponse, errorDetails);

      assertInstanceOf(error, ApiHttpError);
      // An abstract class cannot be used as a value in `assertInstanceOf`.
      // We can check that it is an instance of the base Error class.
      assertInstanceOf(error, Error);
      assertEquals(error.name, "ApiHttpError");
      assertEquals(error.status, 404);
      assertEquals(error.statusText, "Not Found");
      assertEquals(error.message, "HTTP Error: 404 Not Found");
      assertEquals(error.details, errorDetails);
      assertEquals(error.cause, errorDetails);
    });
  });

  describe("ApiClientError", () => {
    it("should correctly construct with a message", () => {
      const error = new ApiClientError("Network request failed");

      assertInstanceOf(error, ApiClientError);
      assertInstanceOf(error, Error);
      assertEquals(error.name, "ApiClientError");
      assertEquals(error.message, "Network request failed");
      assertEquals(error.cause, undefined);
    });

    it("should correctly construct with a message and a cause", () => {
      const causeError = new TypeError("Failed to fetch");
      const error = new ApiClientError("Network request failed", {
        cause: causeError,
      });

      assertEquals(error.message, "Network request failed");
      assertEquals(error.cause, causeError);
    });
  });
});
