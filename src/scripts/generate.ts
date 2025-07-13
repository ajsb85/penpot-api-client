import { fileURLToPath } from "node:url";
import * as path from "jsr:@std/path";
import openapiTS from "openapi-typescript";

/**
 * This script generates TypeScript types from the OpenAPI specification file.
 * It uses `openapi-typescript` to create a single, comprehensive type definition file.
 * This ensures the client is always in sync with the API contract.
 */
async function generateTypes() {
  console.log("Starting API type generation...");

  // Resolve paths relative to the script location.
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(__dirname, "..", "..");
  const openapiPath = path.resolve(projectRoot, "openapi.json");
  const outputPath = path.resolve(
    projectRoot,
    "src",
    "client",
    "generated",
    "types.ts",
  );

  try {
    console.log(`Reading OpenAPI spec from: ${openapiPath}`);

    // Generate the TypeScript types from the OpenAPI schema.
    const rawOutput = await openapiTS(openapiPath);

    // Add a Deno lint directive to the top of the generated file.
    // This suppresses the 'no-explicit-any' error for the generated types,
    // which is a pragmatic approach for dealing with third-party code generation.
    const finalOutput =
      `// deno-lint-ignore-file no-explicit-any\n\n${rawOutput}`;

    console.log(`Writing generated types to: ${outputPath}`);

    // Write the final, modified types to the output file.
    await Deno.writeTextFile(outputPath, finalOutput);

    console.log("[SUCCESS] Type generation completed successfully.");
  } catch (error) {
    console.error("[ERROR] Failed to generate API types.");
    console.error(error);
    Deno.exit(1);
  }
}

// Execute the generation process.
generateTypes();
