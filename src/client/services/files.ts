import { RequestBuilder } from "../requestBuilder.ts";
import type { PenpotClientConfig } from "../../index.ts";
import type { components, paths } from "../generated/types.ts";

// Type aliases for better readability, sourced from generated types.
// FIX: Pointed to the correct, namespaced type definitions from the generated types.ts file.
type Uuid = components["schemas"]["appCommonSchema$uuid"];
type PenpotFile =
  paths["/command/get-file"]["post"]["responses"]["default"]["content"][
    "application/json"
  ];
type GetFileParams =
  paths["/command/get-file"]["post"]["requestBody"]["content"][
    "application/json"
  ];

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
 * Provides access to the Files API endpoints.
 */
export class FilesApi {
  private config: PenpotClientConfig;

  /**
   * @internal
   */
  constructor(config: PenpotClientConfig) {
    this.config = config;
  }

  /**
   * Retrieve a file by its ID.
   *
   * @param params - The parameters for the request.
   * @returns A `RequestBuilder` for this API call.
   * @see https://design.penpot.app/api-docs/index.html#/Files/get-file
   */
  public getFile(params: GetFileParams): RequestBuilder<PenpotFile> {
    return new RequestBuilder(
      this.config,
      "POST",
      "/api/rpc/command/get-file",
      params,
    );
  }

  /**
   * Export a file in a specified format.
   *
   * @param params - The parameters for the request, including fileId and format.
   * @returns A `RequestBuilder` for this API call. The response will be a raw `ArrayBuffer`.
   * @see https://design.penpot.app/api-docs/index.html#/Files/export
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
      // Corrected endpoint path
      "/api/rpc/command/export-binfile",
      body,
    );
  }

  /**
   * Import a .penpot file.
   *
   * Note: This endpoint uses Server-Sent Events (SSE) and is handled specially
   * by the internal request logic to parse the event stream.
   *
   * @param params - The parameters for the request, including projectId, a name for the new file, and the raw file content.
   * @returns A `RequestBuilder` for this API call. The response will contain the new file ID.
   * @see https://design.penpot.app/api-docs/index.html#/Files/import-binfile
   */
  public importFile(
    params: ImportBinfileBody,
  ): RequestBuilder<{ fileId: Uuid }> {
    return new RequestBuilder(
      this.config,
      "POST",
      "/api/rpc/command/import-binfile",
      params,
    );
  }
}
