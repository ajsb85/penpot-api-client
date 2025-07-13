import { fileURLToPath } from "node:url";
import * as path from "jsr:@std/path";
import openapiTS from "openapi-typescript";

/**
 * @file This script is responsible for generating TypeScript type definitions
 * from the OpenAPI (Swagger) specification file (`openapi.json`).
 * It uses the `openapi-typescript` library to create a single, comprehensive
 * type definition file (`src/client/generated/types.ts`).
 *
 * @remarks
 * The primary purpose of this script is to ensure that the Penpot API client
 * remains fully synchronized with the backend's API contract. This automated
 * generation process is crucial for maintaining type safety across the client,
 * reducing the likelihood of runtime errors due to API mismatches.
 *
 * It also adds a Deno lint directive to suppress `no-explicit-any` errors
 * in the generated file, which is a pragmatic approach for handling types
 * generated from external schemas that might contain `any` implicitly.
 *
 * @packageDocumentation
 */

/**
 * This script generates TypeScript types from the OpenAPI specification file.
 * It uses `openapi-typescript` to create a single, comprehensive type definition file.
 * This ensures the client is always in sync with the API contract.
 *
 * @async
 * @function generateTypes
 * @returns {Promise<void>} A Promise that resolves when the type generation process is complete,
 * or rejects if an error occurs during file reading, type generation, or writing.
 * @throws {Error} If any step of the generation process fails (e.g., `openapi.json` not found,
 * `openapi-typescript` encounters an error, or file writing fails).
 *
 * @example
 * ```typescript
 * // This script is typically run via a Deno task defined in deno.json:
 * // "tasks": {
 * //   "gen": "deno run --allow-read --allow-write --allow-env ./src/scripts/generate.ts"
 * // }
 * // To execute from the command line:
 * // deno task gen
 *
 * // The script will output success or error messages to the console.
 * ```
 */
async function generateTypes() {
  console.log("Starting API type generation...");

  // Resolve paths relative to the script's current execution location.
  // `__dirname` is obtained using `fileURLToPath` and `path.dirname` for cross-runtime compatibility.
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // Determine the project root directory, two levels up from the script location.
  const projectRoot = path.resolve(__dirname, "..", "..");
  // Construct the full path to the OpenAPI specification file.
  const openapiPath = path.resolve(projectRoot, "openapi.json");
  // Construct the full path where the generated TypeScript types will be written.
  const outputPath = path.resolve(
    projectRoot,
    "src",
    "client",
    "generated",
    "types.ts"
  );

  try {
    console.log(`Reading OpenAPI spec from: ${openapiPath}`);

    // Call `openapi-typescript` to generate the raw TypeScript type definitions
    // from the OpenAPI schema file.
    const rawOutput = await openapiTS(openapiPath);

    // Prepend a Deno lint directive to the top of the generated file.
    // This directive (`// deno-lint-ignore-file no-explicit-any`) is added
    // to suppress potential `no-explicit-any` linting errors that might arise
    // from the auto-generated types, which can sometimes legitimately use `any`
    // for complex or unspecified schema parts. This is a pragmatic choice for
    // generated code.
    const finalOutput = `// deno-lint-ignore-file no-explicit-any\n\n${rawOutput}`;

    console.log(`Writing generated types to: ${outputPath}`);

    // Write the final, modified (with lint directive) types content to the output file.
    // `Deno.writeTextFile` requires `--allow-write` permission.
    await Deno.writeTextFile(outputPath, finalOutput);

    console.log("[SUCCESS] Type generation completed successfully.");
  } catch (error) {
    // Log an error message if any part of the process fails.
    console.error("[ERROR] Failed to generate API types.");
    console.error(error); // Log the specific error details.
    Deno.exit(1); // Exit the process with a non-zero status code to indicate failure.
  }
}

// Execute the generation process when the script is run.
generateTypes();
