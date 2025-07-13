// examples/basic_workflow.ts

import { PenpotClient, ApiClientError, AuthenticationError, UUID, ImportBinfileSuccessResponse, UserProfileResponse } from "../src/client/mod.ts";

// Import user-specific configuration (create config.ts from config.ts.sample)
import { MY_PENPOT_EMAIL, MY_PENPOT_PASSWORD, TARGET_PROJECT_ID_FOR_IMPORT, FILE_ID_TO_EXPORT, DEMO_PENPOT_FILE_PATH, AUTH_TOKEN_FROM_CONFIG } from "./config.ts";

const PENPOT_API_BASE_URL = "https://design.penpot.app/api/rpc";

async function runWorkflow() {
  console.log("Starting Penpot API operations workflow...");

  // 1. Initialize the client with the auth-token from config.ts
  if (!AUTH_TOKEN_FROM_CONFIG || AUTH_TOKEN_FROM_CONFIG === "YOUR_AUTH_TOKEN_FROM_HAR_OR_UI_HERE") {
      console.error("Error: AUTH_TOKEN_FROM_CONFIG is not set or is still the placeholder in examples/config.ts.");
      console.error("Please obtain a valid 'auth-token' cookie value from your browser's Penpot session (e.g., via HAR file) and paste it into config.ts.");
      return;
  }
  const client = new PenpotClient(PENPOT_API_BASE_URL, AUTH_TOKEN_FROM_CONFIG);
  console.log("Client initialized with auth-token from config.ts.");

  // 2. OPTIONAL: Login to fetch user profile data (authentication is already via auth-token)
  console.log("Attempting 'login' call (for profile data verification)...");
  try {
    const userProfile: UserProfileResponse | null = await client.loginWithPassword(MY_PENPOT_EMAIL, MY_PENPOT_PASSWORD);
    if (!userProfile) {
      console.warn("Login call failed or returned no profile. Check email/password if this is unexpected.");
    } else {
      console.log("Login call returned profile data. User ID:", userProfile["~:id"]);
      console.log("User Email:", userProfile["~:email"]);
      console.log("User Fullname:", userProfile["~:fullname"]);
    }
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      console.error(`Login Authentication Failed: ${error.message}`);
    } else if (error instanceof ApiClientError) {
      console.error(`Login API Error: ${error.message}`);
    } else {
      console.error("An unexpected error occurred during login call:", error);
    }
  }

  // 3. Read the local .penpot file for import
  let fileContent: Uint8Array;
  try {
    console.log(`Reading binary file from: ${DEMO_PENPOT_FILE_PATH}`);
    fileContent = await Deno.readFile(DEMO_PENPOT_FILE_PATH);
    console.log(`File size: ${fileContent.byteLength} bytes.`);
  } catch (error: unknown) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`Error: The file '${DEMO_PENPOT_FILE_PATH}' was not found. Please ensure it exists.`);
    } else if (error instanceof Error) {
      console.error(`Error reading file: ${error.message}`);
    } else {
      console.error("An unknown error occurred while reading the file:", error);
    }
    return;
  }

  // 4. Import the .penpot file
  const importFileName = `Imported_Design_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const importVersion = 3;

  try {
    console.log(`Importing file '${importFileName}' to project '${TARGET_PROJECT_ID_FOR_IMPORT}'...`);
    const importResult: ImportBinfileSuccessResponse = await client.files.importBinfile(
      importFileName,
      TARGET_PROJECT_ID_FOR_IMPORT as UUID,
      importVersion,
      fileContent
    );
    console.log("File imported successfully! New File ID:", importResult.fileId);
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      console.error(`API Error during import: ${error.message}`);
      console.log("Server response details:", error.details);
    } else {
      console.error("An unexpected error occurred during import:", error);
    }
  }

  // 5. Export a Penpot file
  const exportVersion = 3;
  const includeLibraries = true;
  const embedAssets = false;
  const exportOutputFileName = `exported_file_${FILE_ID_TO_EXPORT}_${Date.now()}.penpot`;

  try {
    console.log(`Exporting file with ID '${FILE_ID_TO_EXPORT}'...`);
    const exportedFileBuffer: ArrayBuffer = await client.files.exportBinfile(
      FILE_ID_TO_EXPORT as UUID,
      exportVersion,
      includeLibraries,
      embedAssets
    );
    console.log(`Successfully exported ${exportedFileBuffer.byteLength} bytes.`);

    await Deno.writeFile(exportOutputFileName, new Uint8Array(exportedFileBuffer));
    console.log(`Exported file saved to: ${exportOutputFileName}`);
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      console.error(`API Error during export: ${error.message}`);
      console.log("Server response details:", error.details);
    } else {
      console.error("An unexpected error occurred during export:", error);
    }
  }

  console.log("Workflow completed.");
}

runWorkflow();