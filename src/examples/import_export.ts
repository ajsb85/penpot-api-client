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
 * A type guard to check if an object has a 'code' property.
 * This allows for safer access to properties on `unknown` types.
 */
interface ErrorWithCode {
  code?: string;
}
function hasCode(obj: unknown): obj is ErrorWithCode {
  return typeof obj === "object" && obj !== null && "code" in obj;
}

/**
 * This workflow demonstrates a complete import-then-export process.
 * 1. It reads a local `.penpot` file.
 * 2. It imports that file into a specified Penpot project.
 * 3. It uses the file ID from the import response to immediately export it.
 * 4. It saves the exported file to disk with a new name.
 */
async function runWorkflow() {
  console.log("--- Starting Penpot Import/Export Workflow ---");

  // --- Validate Configuration ---
  if (
    PENPOT_ACCESS_TOKEN.startsWith("YOUR_") ||
    TARGET_PROJECT_ID.startsWith("YOUR_")
  ) {
    console.error(
      "[ERROR] Please update `src/examples/config.ts` with your actual Penpot credentials and project ID.",
    );
    return;
  }

  // --- Initialize the Client with debugging enabled ---
  const client = new PenpotClient({
    baseUrl: PENPOT_BASE_URL,
    accessToken: PENPOT_ACCESS_TOKEN,
    debug: false, // <-- Set to true to see verbose logs
  });

  let newFileId: string | undefined;

  // --- 1. Import the File ---
  console.log(`\n[1/2] Importing file: ${DEMO_PENPOT_FILE_PATH}...`);
  try {
    const fileData = await Deno.readFile(DEMO_PENPOT_FILE_PATH);

    const fileName = path.basename(DEMO_PENPOT_FILE_PATH);

    const { data, error } = await client.files
      .importFile({
        projectId: TARGET_PROJECT_ID,
        name: fileName,
        file: fileData,
        version: 3,
      })
      .exec();

    if (error) {
      console.error(`[ERROR] Failed to import file.`);
      if (error instanceof ApiHttpError) {
        console.error(`  Status: ${error.status} ${error.statusText}`);
        console.error(`  Details:`, error.details);
      } else {
        console.error(`  Message: ${error.message}`);
      }
      return;
    }

    // The type of `data.fileId` should be string, but the generated type might be `unknown`.
    // We perform a runtime check and cast to ensure type safety.
    if (typeof data.fileId === "string") {
      newFileId = data.fileId;
      console.log(`[OK] File imported successfully. New File ID: ${newFileId}`);
    } else {
      console.error(
        "[ERROR] The fileId received from the server was not a string.",
      );
      return;
    }
  } catch (err: unknown) {
    // Check if the error is an instance of Deno's NotFound error.
    if (err instanceof Deno.errors.NotFound) {
      console.error(
        `[ERROR] Demo file not found at path: ${DEMO_PENPOT_FILE_PATH}`,
      );
    } else if (err instanceof Error) {
      console.error(
        "[ERROR] An unexpected error occurred during the file read or import process:",
        err.message,
      );
    } else {
      console.error("[ERROR] An unknown error occurred:", err);
    }
    return;
  }

  // --- 2. Export the Newly Imported File ---
  if (!newFileId) {
    console.error(
      "\n[SKIP] Skipping export because import failed to return a file ID.",
    );
    return;
  }

  console.log(`\n[2/2] Exporting file with ID: ${newFileId}...`);
  const { data: exportedFileBuffer, error: exportError } = await client.files
    .exportFile({ id: newFileId })
    .exec();

  if (exportError) {
    console.error(`[ERROR] Failed to export file.`);
    if (exportError instanceof ApiHttpError) {
      console.error(
        `  Status: ${exportError.status} ${exportError.statusText}`,
      );
      console.error(`  Details:`, exportError.details);
    } else {
      console.error(`  Message: ${exportError.message}`);
    }
    return;
  }

  // --- Save the Exported File ---
  try {
    const exportOutputFileName =
      `./src/examples/exported_demo_${Date.now()}.penpot`;
    await Deno.writeFile(
      exportOutputFileName,
      new Uint8Array(exportedFileBuffer),
    );
    console.log(`[OK] Exported file saved to: ${exportOutputFileName}`);
  } catch (err: unknown) {
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
  // Prefix unused variables with an underscore to satisfy the linter.
  const { data: _nonExistentData, error: nonExistentError } = await client.files
    .exportFile({ id: "00000000-0000-0000-0000-000000000000" })
    .exec();

  if (nonExistentError) {
    console.log(
      `\n[OK] As expected, the export failed. The enhanced error log above should show the server's response.`,
    );
    if (nonExistentError instanceof ApiHttpError) {
      // Use a type guard for safer access to the 'details' property.
      if (hasCode(nonExistentError.details)) {
        console.log(
          `  Programmatic Error Details: Status=${nonExistentError.status}, Code=${nonExistentError.details.code}`,
        );
      }
    }
  } else {
    console.warn(
      "[WARN] The export of a non-existent file succeeded unexpectedly.",
    );
  }

  console.log("\n--- Workflow Completed ---");
}

runWorkflow();
