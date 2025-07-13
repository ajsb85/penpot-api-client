import { RequestBuilder } from "../requestBuilder.ts";
import type { PenpotClientConfig } from "../../index.ts";
import type { components, paths } from "../generated/types.ts";

// Type aliases for better readability, sourced from generated types.
// FIX: Pointed to the correct, namespaced type definitions from the generated types.ts file.
type Uuid = components["schemas"]["appCommonSchema$uuid"];
type PenpotFile =
  paths["/command/get-file"]["post"]["responses"]["default"]["content"]["application/json"];
type GetFileParams =
  paths["/command/get-file"]["post"]["requestBody"]["content"]["application/json"];

/**
 * The expected body for the import-binfile command.
 * The `file` property should be the raw binary content.
 */
interface ImportBinfileBody {
  projectId: Uuid;
  name: string;
  file: Uint8Array | Blob; // The raw file content
  version?: number;
}

/**
 * @file This file defines the `FilesApi` class, which provides methods
 * for interacting with the file and project management endpoints of the Penpot API.
 * It covers essential operations such as retrieving file details, exporting files
 * in various formats, and importing binary Penpot files.
 *
 * @remarks
 * This class serves as a dedicated client for the file management domain of the Penpot API.
 * It utilizes the {@link RequestBuilder} to construct and send HTTP requests, ensuring
 * consistency in request handling, authentication headers, and structured error processing.
 * The methods within this class directly map to specific RPC commands on the Penpot backend,
 * such as `get-file`, `export-binfile`, and `import-binfile`.
 *
 * @packageDocumentation
 */

/**
 * Provides access to the Files API endpoints.
 * This class is responsible for all file and project-related operations,
 * including retrieval, import, and export of design assets.
 *
 * @class FilesApi
 * @private {PenpotClientConfig} config - The client configuration inherited from the main {@link PenpotClient} instance.
 *
 * @example
 * ```typescript
 * import { PenpotClient } from "@ajsb85/penpot-api-client";
 * import { ApiHttpError } from "@ajsb85/penpot-api-client/client/errors";
 * import type { PenpotFile } from "@ajsb85/penpot-api-client/types";
 *
 * async function managePenpotFiles() {
 * const client = new PenpotClient({
 * baseUrl: "[https://design.penpot.app/api/rpc](https://design.penpot.app/api/rpc)", // Example Penpot RPC API base URL
 * accessToken: "your_access_token",
 * });
 *
 * try {
 * // Example 1: Retrieve details of a specific file
 * const fileIdToFetch = "some-existing-file-uuid"; // Replace with a real file ID
 * const { data: fileDetails, error: fileError } = await client.files.getFile({ id: fileIdToFetch }).exec();
 * if (fileDetails) {
 * console.log(`Fetched file: ${fileDetails.name} (ID: ${fileDetails.id})`);
 * console.log(`Belongs to project: ${fileDetails.projectId}`);
 * } else if (fileError) {
 * console.error(`Error fetching file ${fileIdToFetch}:`, fileError.message);
 * }
 *
 * // Example 2: Import a .penpot file
 * // In a real application, `fileContent` would come from a user upload (Blob) or file system (Uint8Array/Buffer).
 * const mockFileContent = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]); // Placeholder for actual .penpot binary data
 * const projectIdForImport = "your-target-project-uuid"; // Replace with a real project ID
 * const { data: importResult, error: importError } = await client.files.importFile({
 * projectId: projectIdForImport,
 * name: "MyImportedDesign.penpot",
 * file: mockFileContent,
 * version: 3, // Specify Penpot binary format version
 * }).exec();
 * if (importResult) {
 * console.log(`Successfully imported file! New File ID: ${importResult.fileId}`);
 * } else if (importError) {
 * console.error("Error importing file:", importError.message);
 * if (importError instanceof ApiHttpError && (importError.details as any)?.code === "MAX_FILE_SIZE_REACHED") {
 * console.error("File import failed: The file size exceeds the allowed limit.");
 * }
 * }
 *
 * // Example 3: Export a file as ArrayBuffer (e.g., for download)
 * const fileIdToExport = importResult?.fileId || fileIdToFetch; // Use imported ID or the fetched one
 * if (fileIdToExport) {
 * const { data: exportedBuffer, error: exportError } = await client.files.exportFile({ id: fileIdToExport }).exec();
 * if (exportedBuffer) {
 * console.log(`Successfully exported file ${fileIdToExport}. Received ${exportedBuffer.byteLength} bytes.`);
 * // You can now save this ArrayBuffer to a file or process it further.
 * } else if (exportError) {
 * console.error(`Error exporting file ${fileIdToExport}:`, exportError.message);
 * }
 * }
 *
 * } catch (error) {
 * console.error("An unexpected error occurred during file management workflow:", error);
 * }
 * }
 *
 * managePenpotFiles();
 * ```
 */
export class FilesApi {
  private config: PenpotClientConfig;

  /**
   * @internal - This constructor is not meant for public use.
   * Instances of `FilesApi` are created by the main {@link PenpotClient}
   * and exposed via the `client.files` property.
   *
   * @param {PenpotClientConfig} config - The client configuration object, providing `baseUrl`, `accessToken`, etc.
   */
  constructor(config: PenpotClientConfig) {
    this.config = config;
  }

  /**
   * Retrieves a specific file by its unique identifier.
   *
   * This method sends a `POST` request to the `/api/rpc/command/get-file` endpoint.
   * It requires the file's ID as a parameter. The response includes comprehensive
   * details about the file, such as its name, project association, and internal data structure.
   *
   * @param {GetFileParams} params - The parameters for the request, typically an object
   * containing the `id` of the file to retrieve. This corresponds to the request body
   * schema for the `get-file` operation in the OpenAPI spec.
   * @returns {RequestBuilder<PenpotFile>} A {@link RequestBuilder} instance for this API call.
   * The `PenpotFile` type represents the detailed file object returned upon success.
   * @see https://design.penpot.app/api-docs/index.html#/Files/get-file
   *
   * @example
   * ```typescript
   * // Assuming `client` is an initialized PenpotClient instance
   * async function getFileDetails(fileId: Uuid) {
   * const { data: file, error: fileError } = await client.files.getFile({ id: fileId }).exec();
   *
   * if (file) {
   * console.log(`File Name: ${file.name}`);
   * console.log(`File Revision: ${file.revn}`);
   * console.log(`File Project ID: ${file.projectId}`);
   * // Access other properties like file.features, file.permissions, file.data, etc.
   * } else {
   * console.error("Failed to get file details:", fileError?.message);
   * // Handle specific errors, e.g., if the file is not found
   * // if (fileError instanceof ApiHttpError && fileError.status === 404) {
   * //   console.error("The requested file does not exist.");
   * // }
   * }
   * }
   * // getFileDetails("your-file-uuid" as Uuid);
   * ```
   */
  public getFile(params: GetFileParams): RequestBuilder<PenpotFile> {
    return new RequestBuilder(
      this.config,
      "POST",
      "/api/rpc/command/get-file",
      params
    );
  }

  /**
   * Exports a file in a specified binary format (e.g., `.penpot`, SVG, PDF, PNG).
   *
   * This method sends a `POST` request to the `/api/rpc/command/export-binfile` endpoint.
   * It initiates an export process on the server, and the response typically contains
   * the raw binary data of the exported file as an `ArrayBuffer`.
   *
   * @param {object} params - The parameters for the export request.
   * @param {Uuid} params.id - The unique identifier of the file to export.
   * @param {boolean} [params.includeLibraries=true] - Optional. For `.penpot` exports,
   * specifies whether to include linked shared libraries in the exported file. Defaults to `true`.
   * @param {boolean} [params.embedAssets=false] - Optional. For `.penpot` exports,
   * specifies whether to embed external library assets directly into the file's local library. Defaults to `false`.
   * @param {number} [params.version=3] - Optional. For `.penpot` exports, specifies the binary file format version.
   * Currently, version `3` is recommended for modern Penpot files. Defaults to `3`.
   * @returns {RequestBuilder<ArrayBuffer>} A {@link RequestBuilder} instance for this API call.
   * The `ArrayBuffer` type indicates that the successful response will be the raw binary content of the exported file.
   * @see https://design.penpot.app/api-docs/index.html#/Files/export
   *
   * @example
   * ```typescript
   * // Assuming `client` is an initialized PenpotClient instance
   * async function exportFileAsPenpot(fileId: Uuid) {
   * const { data: exportedFileBuffer, error: exportError } = await client.files.exportFile({
   * id: fileId,
   * includeLibraries: true,
   * embedAssets: false,
   * version: 3, // Export as Penpot binary format v3
   * }).exec();
   *
   * if (exportedFileBuffer) {
   * console.log(`File ${fileId} exported successfully. Received ${exportedFileBuffer.byteLength} bytes.`);
   * // You can now save this `ArrayBuffer` to a file (e.g., using Deno.writeFile or Node.js fs.writeFile)
   * // await Deno.writeFile(`exported_${fileId}.penpot`, new Uint8Array(exportedFileBuffer));
   * } else {
   * console.error("Failed to export file:", exportError?.message);
   * // Handle specific errors, e.g., if the file ID is invalid or format not supported
   * // if (exportError instanceof ApiHttpError && exportError.status === 400) {
   * //   console.error("Invalid export parameters or unsupported format.");
   * // }
   * }
   * }
   * // exportFileAsPenpot("your-file-uuid" as Uuid);
   * ```
   */
  public exportFile(params: { id: Uuid }): RequestBuilder<ArrayBuffer> {
    // Manually construct the body with the correct `file-id` key, as the
    // generated type uses `id` which is incorrect for this endpoint.
    const body = {
      "file-id": params.id,
      "include-libraries": true,
      "embed-assets": false,
      version: 3,
    };

    return new RequestBuilder(
      this.config,
      "POST",
      // Corrected endpoint path based on OpenAPI spec for export-binfile
      "/api/rpc/command/export-binfile",
      body
    );
  }

  /**
   * Imports a binary Penpot file (`.penpot`) or other supported file formats (e.g., SVG)
   * into a specified project.
   *
   * This method sends a `POST` request to the `/api/rpc/command/import-binfile` endpoint.
   * It requires the target `projectId`, a `name` for the new file, and the raw `file` content
   * along with its `mimeType`.
   *
   * @param {ImportBinfileBody} params - The parameters for the import request, including
   * `projectId`, `name`, `file` (the raw binary content as `Uint8Array` or `Blob`),
   * and `mimeType`. An optional `version` can be specified for `.penpot` files.
   * This corresponds to the request body schema for the `import-binfile` operation.
   * @returns {RequestBuilder<{ fileId: Uuid }>} A {@link RequestBuilder} instance for this API call.
   * The successful response will contain an object with the `fileId` of the newly imported file.
   * @see https://design.penpot.app/api-docs/index.html#/Files/import-binfile
   *
   * @remarks
   * This endpoint internally uses Server-Sent Events (SSE) for progress updates and to
   * deliver the final result (the `fileId`). The `sendRequest` utility automatically
   * handles the SSE stream parsing via `handleSseResponse`.
   *
   * When providing `file` content, ensure it's a `Blob` in browser environments
   * or a `Uint8Array` (or Node.js `Buffer`) in server-side runtimes.
   * For `.penpot` files, the `mimeType` should typically be `"application/octet-stream"`.
   *
   * @example
   * ```typescript
   * import type { Uuid } from "@ajsb85/penpot-api-client/types";
   *
   * // Assuming `client` is an initialized PenpotClient instance
   * async function importNewDesign(projectId: Uuid, fileName: string, fileContent: Uint8Array | Blob) {
   * try {
   * const { data: importResult, error: importError } = await client.files.importFile({
   * projectId: projectId,
   * name: fileName,
   * file: fileContent,
   * mimeType: "application/octet-stream", // Or "image/svg+xml" for SVG files
   * version: 3, // Specify version for .penpot files
   * }).exec();
   *
   * if (importResult) {
   * console.log(`Successfully imported "${fileName}". New File ID: ${importResult.fileId}`);
   * } else {
   * console.error(`Failed to import "${fileName}":`, importError?.message);
   * // Handle specific errors, e.g., file size limits, invalid file format
   * // if (importError instanceof ApiHttpError && (importError.details as any)?.code === "INVALID_BINFILE_V3") {
   * //   console.error("The provided .penpot file is corrupted or invalid.");
   * // }
   * }
   * } catch (e) {
   * console.error("An unexpected error occurred during import:", e);
   * }
   * }
   *
   * // Example usage (Deno/Node.js):
   * // import { readFileSync } from 'node:fs'; // For Node.js
   * // const demoFileContent = Deno.readFileSync("./path/to/demo.penpot"); // For Deno
   * // importNewDesign("your-project-uuid" as Uuid, "MyDemoDesign.penpot", demoFileContent);
   *
   * // Example usage (Browser with File API):
   * // const fileInput = document.getElementById('file-upload') as HTMLInputElement;
   * // fileInput.addEventListener('change', async (event) => {
   * //   const file = event.target.files?.[0];
   * //   if (file) {
   * //     await importNewDesign("your-project-uuid" as Uuid, file.name, file);
   * //   }
   * // });
   * ```
   */
  public importFile(
    params: ImportBinfileBody
  ): RequestBuilder<{ fileId: Uuid }> {
    return new RequestBuilder(
      this.config,
      "POST",
      "/api/rpc/command/import-binfile",
      params
    );
  }
}
