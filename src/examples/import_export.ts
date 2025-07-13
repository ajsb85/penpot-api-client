/// <reference lib="deno.ns" />

import { PenpotClient } from "../index.ts";
import { ApiHttpError } from "../client/errors.ts";
import * as path from "jsr:@std/path";
import {
  DEMO_PENPOT_FILE_PATH,
  PENPOT_ACCESS_TOKEN,
  PENPOT_BASE_URL,
  TARGET_PROJECT_ID,
} from "./config.ts";

/**
 * @file This script demonstrates a complete import-then-export workflow using the Penpot API client.
 * It serves as a practical example for how to:
 * 1. Read a local binary `.penpot` file from the file system.
 * 2. Authenticate and initialize the {@link PenpotClient}.
 * 3. Import the `.penpot` file into a specified project on the Penpot instance.
 * 4. Extract the newly created file's ID from the import response.
 * 5. Use the obtained file ID to immediately export the file back from Penpot.
 * 6. Save the exported binary data to a new local file.
 * 7. Showcase error handling for various API interaction scenarios, including file system errors and API-specific errors.
 *
 * @remarks
 * This example is designed to be runnable in a Deno environment.
 * Before running, ensure you have copied `config.ts.sample` to `config.ts` and filled in
 * your `PENPOT_ACCESS_TOKEN`, `PENPOT_BASE_URL`, and `TARGET_PROJECT_ID`.
 *
 * It highlights the use of `client.files.importFile` (which internally handles SSE streams for results)
 * and `client.files.exportFile` (which returns an `ArrayBuffer`).
 *
 * @packageDocumentation
 */

/**
 * A type guard function to check if an `unknown` object has a `code` property.
 * This is particularly useful for safely accessing specific error codes from API error details,
 * which might be of `unknown` type.
 *
 * @interface ErrorWithCode
 * @property {string} [code] - Optional. The `code` property, if it exists on the object.
 *
 * @param {unknown} obj - The object to check.
 * @returns {obj is ErrorWithCode} `true` if the object is not null, is an object, and has a `code` property; otherwise, `false`.
 *
 * @example
 * ```typescript
 * // Assuming `error.details` is of type `unknown`
 * const apiErrorDetails: unknown = { code: "INVALID_INPUT", message: "Bad data" };
 * if (hasCode(apiErrorDetails)) {
 * console.log(`Error Code: ${apiErrorDetails.code}`); // Safely access .code
 * }
 * ```
 */
interface ErrorWithCode {
  code?: string;
}
function hasCode(obj: unknown): obj is ErrorWithCode {
  return typeof obj === "object" && obj !== null && "code" in obj;
}

/**
 * This asynchronous function executes the main import-then-export workflow.
 * It orchestrates file reading, client initialization, API calls for import and export,
 * and local file saving, with comprehensive error handling at each step.
 *
 * @async
 * @function runWorkflow
 * @returns {Promise<void>} A Promise that resolves when the workflow is completed,
 * or rejects if a critical unhandled error occurs. It logs messages and errors to the console.
 *
 * @throws {Deno.errors.NotFound} If the demo `.penpot` file is not found at the specified path.
 * @throws {Error} For unexpected errors during file operations or API interactions not caught by `ApiHttpError`.
 *
 * @example
 * ```typescript
 * // This function is designed to be called directly, typically from the end of the script:
 * // runWorkflow();
 * // It will log its progress and results to the console.
 * ```
 */
async function runWorkflow() {
  console.log("--- Starting Penpot Import/Export Workflow ---");

  // --- Validate Configuration ---
  // Checks if placeholder values are still present in `config.ts`.
  if (
    PENPOT_ACCESS_TOKEN.startsWith("YOUR_") ||
    TARGET_PROJECT_ID.startsWith("YOUR_")
  ) {
    console.error(
      "[ERROR] Please update `src/examples/config.ts` with your actual Penpot credentials and project ID.",
    );
    return; // Exit if configuration is not set up.
  }

  // --- Initialize the Client with debugging enabled ---
  // Creates a new instance of the PenpotClient.
  // The `debug: true` option (if enabled in config.ts) will cause the client's internal
  // debug middleware to log detailed request/response information.
  const client = new PenpotClient({
    baseUrl: PENPOT_BASE_URL,
    accessToken: PENPOT_ACCESS_TOKEN,
    debug: false, // <-- Set to true in config.ts to see verbose logs
  });

  let newFileId: string | undefined; // Variable to store the ID of the newly imported file.

  // --- 1. Import the File ---
  console.log(`\n[1/2] Importing file: ${DEMO_PENPOT_FILE_PATH}...`);
  try {
    // Read the binary content of the demo .penpot file from the local file system.
    // Requires `--allow-read` Deno permission.
    const fileData = await Deno.readFile(DEMO_PENPOT_FILE_PATH);

    // Extract the base name of the file (e.g., "demo.penpot") to use as the imported file's name.
    const fileName = path.basename(DEMO_PENPOT_FILE_PATH);

    // Call the `importFile` method of the FilesApi.
    // The `.exec()` method initiates the API call and returns an ApiResponse.
    const { data, error } = await client.files
      .importFile({
        projectId: TARGET_PROJECT_ID, // The project ID where the file will be imported.
        name: fileName, // The name for the new file in Penpot.
        file: fileData, // The raw binary content of the file.
        version: 3, // Specify Penpot binary format version 3.
      })
      .exec();

    // Check if an error occurred during the import process.
    if (error) {
      console.error(`[ERROR] Failed to import file.`);
      // Differentiate between HTTP-specific errors and other API client errors.
      if (error instanceof ApiHttpError) {
        console.error(`  Status: ${error.status} ${error.statusText}`);
        console.error(`  Details:`, error.details); // Log detailed error response from the server.
      } else {
        console.error(`  Message: ${error.message}`); // Log generic client-side error message.
      }
      return; // Stop workflow on import failure.
    }

    // If import was successful, extract the new file ID.
    // The `importFile` method returns `{ fileId: Uuid }`. We perform a runtime check
    // to ensure type safety, as the generated type might be `unknown`.
    if (typeof data.fileId === "string") {
      newFileId = data.fileId;
      console.log(`[OK] File imported successfully. New File ID: ${newFileId}`);
    } else {
      // This case indicates an unexpected response format from the server.
      console.error(
        "[ERROR] The fileId received from the server was not a string.",
      );
      return; // Stop workflow on unexpected response.
    }
  } catch (err: unknown) {
    // Catch any exceptions that occur outside of the API response (e.g., file system errors).
    if (err instanceof Deno.errors.NotFound) {
      // Specific handling for Deno's file not found error.
      console.error(
        `[ERROR] Demo file not found at path: ${DEMO_PENPOT_FILE_PATH}`,
      );
    } else if (err instanceof Error) {
      // Catch generic JavaScript Error instances.
      console.error(
        "[ERROR] An unexpected error occurred during the file read or import process:",
        err.message,
      );
    } else {
      // Catch any other unknown error types.
      console.error("[ERROR] An unknown error occurred:", err);
    }
    return; // Stop workflow on unhandled error.
  }

  // --- 2. Export the Newly Imported File ---
  // Ensure a new file ID was obtained from the import step.
  if (!newFileId) {
    console.error(
      "\n[SKIP] Skipping export because import failed to return a file ID.",
    );
    return; // Skip export if import failed.
  }

  console.log(`\n[2/2] Exporting file with ID: ${newFileId}...`);
  // Call the `exportFile` method of the FilesApi.
  // The `.exec()` method initiates the API call and returns an ApiResponse.
  const { data: exportedFileBuffer, error: exportError } = await client.files
    .exportFile({ id: newFileId }) // Export the file using its ID.
    .exec();

  // Check if an error occurred during the export process.
  if (exportError) {
    console.error(`[ERROR] Failed to export file.`);
    // Differentiate between HTTP-specific errors and other API client errors.
    if (exportError instanceof ApiHttpError) {
      console.error(
        `  Status: ${exportError.status} ${exportError.statusText}`,
      );
      console.error(`  Details:`, exportError.details); // Log detailed error response from the server.
    } else {
      console.error(`  Message: ${exportError.message}`); // Log generic client-side error message.
    }
    return; // Stop workflow on export failure.
  }

  // --- Save the Exported File ---
  try {
    // Construct a unique output file name for the exported data.
    const exportOutputFileName =
      `./src/examples/exported_demo_${Date.now()}.penpot`;
    // Write the received ArrayBuffer (exported file content) to a new local file.
    // Requires `--allow-write` Deno permission.
    await Deno.writeFile(
      exportOutputFileName,
      new Uint8Array(exportedFileBuffer), // Convert ArrayBuffer to Uint8Array for writing.
    );
    console.log(`[OK] Exported file saved to: ${exportOutputFileName}`);
  } catch (err: unknown) {
    // Catch any exceptions during the file writing process.
    if (err instanceof Error) {
      console.error(
        "[ERROR] An unexpected error occurred while saving the exported file:",
        err.message,
      );
    } else {
      console.error("[ERROR] An unknown error occurred:", err);
    }
  }

  // --- 3. Attempt to Export a Non-Existent File to Showcase Error Logging ---
  console.log(`\n[3/3] Attempting to export a non-existent file...`);
  // Attempt to export a known non-existent UUID to demonstrate robust error handling.
  // The result is destructured, but `_nonExistentData` is prefixed with `_` to indicate it's unused
  // and satisfy linting rules.
  const { data: _nonExistentData, error: nonExistentError } = await client.files
    .exportFile({ id: "00000000-0000-0000-0000-000000000000" }) // Use a dummy UUID.
    .exec();

  // Check if an error was correctly returned for the non-existent file.
  if (nonExistentError) {
    console.log(
      `\n[OK] As expected, the export failed. The enhanced error log above should show the server's response.`,
    );
    // If the error is an `ApiHttpError`, further inspect its details using the `hasCode` type guard.
    if (nonExistentError instanceof ApiHttpError) {
      // Use a type guard for safer access to the 'details' property, as it's `unknown`.
      if (hasCode(nonExistentError.details)) {
        console.log(
          `  Programmatic Error Details: Status=${nonExistentError.status}, Code=${nonExistentError.details.code}`,
        );
      }
    }
  } else {
    // This warning indicates an unexpected success for a non-existent file export,
    // suggesting a potential issue with the API or test setup.
    console.warn(
      "[WARN] The export of a non-existent file succeeded unexpectedly.",
    );
  }

  console.log("\n--- Workflow Completed ---");
}

// Execute the main workflow function.
// This call initiates the entire process when the script is run.
runWorkflow();
