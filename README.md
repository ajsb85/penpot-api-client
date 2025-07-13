# Penpot Deno API Client (`@penpot/api-client`)

[![JSR Version](https://jsr.io/badges/@penpot/api-client)](https://jsr.io/@penpot/api-client)
[![Deno Compatibility](https://deno.land/badge/penpot_deno_client)](https://deno.land/x/penpot_deno_client)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A powerful and type-safe Deno API client for interacting with the Penpot design
platform, automatically generated from its OpenAPI specification. This library
is designed for modern Deno applications, leveraging web-standard APIs and
advanced TypeScript features for a seamless development experience.

## ? Features

- **? Code-Generated Core:** The foundational API methods and data models are
  automatically generated from Penpot's OpenAPI specification. This ensures
  direct correspondence with the API, minimizing manual errors and keeping the
  client perpetually up-to-date with upstream changes.
- **? End-to-End Type Safety:** Fully written in TypeScript with strict mode
  enabled, providing comprehensive compile-time validation for all API requests
  and responses. No more guessing data shapes!
- **? Deno-Native:** Built from the ground up for Deno, strictly adhering to
  web-standard APIs (`fetch`, `Headers`, `FormData`, `URL`, `TextDecoder`,
  `ReadableStream`) and Deno's secure permission model.
- **? Robust Session Management:** Handles complex HTTP-only cookie-based
  session authentication internally, abstracting away the intricacies of
  `Set-Cookie` headers and `credentials` management.
- **? Streaming & Server-Sent Events (SSE) Support:** Explicitly processes
  `text/event-stream` responses (critical for operations like file imports) as
  event streams, providing granular progress updates and extracting final
  results efficiently.
- **? Web-Standard APIs:** Leverages familiar browser-like APIs, making it
  intuitive for web developers transitioning to Deno.
- **? Structured Error Handling:** Implements custom error classes
  (`ApiClientError`, `AuthenticationError`) for predictable and granular error
  identification and handling, improving application stability.
- **? JSR-Ready:** Designed for seamless publication and consumption via the JSR
  registry, supporting Deno, Node.js (ESM), and bundlers for browser
  environments.

## ? Design Principles (Modern Deno/TypeScript)

1. **Strict TypeScript:** Employ `strict: true` in `tsconfig.json` (or
   `deno.json`'s `compilerOptions`) to enforce the highest level of type safety.
   Use explicit types over `any` wherever possible, even for complex API
   responses by defining interfaces derived from the OpenAPI spec.
2. **Web Standards First:** Prioritize Deno's native `fetch` API, `Headers`,
   `URL`, `FormData`, `TextDecoder`, and `ReadableStream` over third-party
   polyfills or Node.js compatibility layers. This ensures lean, secure, and
   performant code.
3. **Automated Code Generation:** A dedicated Deno script
   (`src/scripts/generate_client.ts`) parses the `openapi.json` and outputs
   strongly-typed API service classes and data interfaces into
   `src/client/generated/`. This is the cornerstone for maintaining API
   accuracy.
4. **Modular and Layered Architecture:**
   - **Generated Layer (`src/client/generated/`):** Contains raw API methods and
     types directly mapped from the OpenAPI spec. These methods are simple
     wrappers around a generic `request` handler.
   - **Internal Utilities (`src/client/_internals/`):** Houses private helpers
     for common tasks like network requests, error parsing, and stream handling.
   - **Public Client (`src/client/mod.ts`):** The main entry point that composes
     the generated API parts, manages global concerns like authentication, and
     provides a clean, user-friendly interface.
5. **Explicit Authentication Flow:** The `PenpotClient`'s `loginWithPassword`
   method directly handles the HTTP exchange to receive the `auth-token` cookie
   and manages its lifecycle (setting it in subsequent `Cookie` headers) to
   ensure seamless authenticated requests without manual token passing.
6. **Streamlined Error Handling:** Custom error classes extend the native
   `Error` and carry additional context (HTTP status, API-specific details) for
   more precise error management.
7. **JSR Compatibility:** Uses `jsr:` specifiers in `deno.json` for dependencies
   and is structured to be easily published to JSR, ensuring broad ecosystem
   compatibility (Deno, Node.js ESM, Webpack/Rollup for browsers).

## ? Development Setup & Tasks

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ajsb85/penpot-api-client.git
   cd penpot-apis-client
   ```

2. **Fetch `openapi.json`:** Place your `openapi.json` file (from Penpot's API
   endpoint documentation) in the project root.

3. **Run Code Generation:** This task reads `openapi.json` and populates
   `src/client/generated/`.
   ```bash
   deno task gen
   ```

4. **Run Tests:**
   ```bash
   deno test
   ```

## ? Installation & Usage

### Installation

Add it to your project using `deno add`:

```bash
deno add @penpot/api-client
```

This command will update your `deno.json` with an import map entry like this:

```json
{
  "imports": {
    "@penpot/api-client": "jsr:@penpot/api-client@^0.1.0",
    "@std/path": "jsr:@std/path@^0.224.0" // Ensure other necessary @std imports are present
  }
  // ... other config
}
```

### Usage Example: `examples/basic_workflow.ts`

To get started, copy `examples/config.ts.sample` to `examples/config.ts` and
fill in your actual Penpot email and password. **Do NOT commit `config.ts` to
version control!**

```typescript
// examples/basic_workflow.ts

import {
  ApiClientError,
  AuthenticationError,
  PenpotClient,
} from "@penpot/api-client";
import * as Deno from "https://deno.land/std@0.224.0/deno/mod.ts"; // For file operations
import {
  DEMO_PENPOT_FILE_PATH,
  FILE_ID_TO_EXPORT,
  MY_PENPOT_EMAIL,
  MY_PENPOT_PASSWORD,
  TARGET_PROJECT_ID_FOR_IMPORT,
} from "./config.ts"; // Load user config

const PENPOT_API_BASE_URL = "https://design.penpot.app/api/rpc";

async function runWorkflow() {
  console.log("Starting Penpot API operations workflow...");

  // 1. Initialize the client
  const client = new PenpotClient(PENPOT_API_BASE_URL);
  console.log("Client initialized.");

  // 2. Login to establish session
  console.log("Attempting to log in and establish session...");
  try {
    const userProfile = await client.loginWithPassword(
      MY_PENPOT_EMAIL,
      MY_PENPOT_PASSWORD,
    );
    if (!userProfile) {
      console.error(
        "Login failed unexpectedly (no profile returned). Exiting.",
      );
      return;
    }
    console.log("Logged in successfully! User ID:", userProfile["~:id"]);
    // console.log("Full Profile Data:", userProfile); // Uncomment for verbose profile details
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      console.error(`Authentication Failed: ${error.message}`);
    } else if (error instanceof ApiClientError) {
      console.error(`API Error during login: ${error.message}`);
    } else {
      console.error("An unexpected error occurred during login:", error);
    }
    return; // Exit on login failure
  }

  // 3. Read the local .penpot file for import
  let fileContent: Uint8Array;
  try {
    console.log(`Reading binary file from: ${DEMO_PENPOT_FILE_PATH}`);
    fileContent = await Deno.readFile(DEMO_PENPOT_FILE_PATH);
    console.log(`File size: ${fileContent.byteLength} bytes.`);
  } catch (error: unknown) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(
        `Error: The file '${DEMO_PENPOT_FILE_PATH}' was not found. Please ensure it exists.`,
      );
    } else if (error instanceof Error) {
      console.error(`Error reading file: ${error.message}`);
    } else {
      console.error("An unknown error occurred while reading the file:", error);
    }
    return; // Exit if file cannot be read
  }

  // 4. Import the .penpot file
  const importFileName = `Imported_Design_${
    new Date().toISOString().replace(/[:.]/g, "-")
  }`;
  const importVersion = 3; // Standard Penpot format version

  try {
    console.log(
      `Importing file '${importFileName}' to project '${TARGET_PROJECT_ID_FOR_IMPORT}'...`,
    );
    const importResult = await client.files.importBinfile( // Access via client.files
      importFileName,
      TARGET_PROJECT_ID_FOR_IMPORT,
      importVersion,
      fileContent!,
    );
    console.log(
      "File imported successfully! New File ID:",
      importResult.fileId,
    );
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      console.error(`API Error during import: ${error.message}`);
    } else {
      console.error("An unexpected error occurred during import:", error);
    }
  }

  // 5. Export a Penpot file
  const exportVersion = 3;
  const includeLibraries = true;
  const embedAssets = false;
  const exportOutputFileName =
    `exported_design_${FILE_ID_TO_EXPORT}_${Date.now()}.penpot`;

  try {
    console.log(`Exporting file with ID '${FILE_ID_TO_EXPORT}'...`);
    const exportedFileBuffer = await client.files.exportBinfile( // Access via client.files
      FILE_ID_TO_EXPORT,
      exportVersion,
      includeLibraries,
      embedAssets,
    );
    console.log(`Exported file size: ${exportedFileBuffer.byteLength} bytes.`);

    await Deno.writeFile(
      exportOutputFileName,
      new Uint8Array(exportedFileBuffer),
    );
    console.log(`Exported file saved to: ${exportOutputFileName}`);
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      console.error(`API Error during export: ${error.message}`);
    } else {
      console.error("An unexpected error occurred during export:", error);
    }
  }

  console.log("Workflow completed.");
}

runWorkflow();
```

```typescript
// examples/config.ts
// IMPORTANT: This file should NOT be committed to version control!

export const MY_PENPOT_EMAIL = "your_email@example.com";
export const MY_PENPOT_PASSWORD = "your_password";

// Replace with a valid Project ID from your Penpot account where you have write access
export const TARGET_PROJECT_ID_FOR_IMPORT = "YOUR_PROJECT_ID_FOR_IMPORT_HERE";

// Replace with a valid File ID from your Penpot account that you want to export
// You can use the ID of a file successfully imported, or any existing file.
export const FILE_ID_TO_EXPORT = "YOUR_FILE_ID_TO_EXPORT_HERE";
export const DEMO_PENPOT_FILE_PATH = "./demo.penpot"; // Path to your local test file
```
