import { defineConfig } from "vitest/config";

/**
 * Vitest configuration file.
 * @see https://vitest.dev/config/
 */
export default defineConfig({
  test: {
    // Run all tests in a Node.js environment by default.
    // This aligns with the most common consumption environment outside of Deno.
    environment: "node",

    // Define where to find test files.
    include: ["src/**/*.test.ts"],

    // Enable Jest-compatible globals (describe, it, expect) for a familiar API.
    globals: true,

    // Set a reasonable timeout for tests, especially those involving network requests.
    testTimeout: 10000,
  },
});
