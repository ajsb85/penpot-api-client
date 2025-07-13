// src/client/generated/files_api.ts
// AUTOMATICALLY GENERATED - DO NOT EDIT MANUALLY

import { request } from "../_internals/mod.ts";
import type { UUID } from "./types.ts";
import type { ImportBinfileSuccessResponse } from "../auth.ts";

export class FilesApi {
  private baseUrl: string;
  private getAuthToken: () => string | undefined; // Renamed from getPersonalAccessToken

  constructor(baseUrl: string, getAuthToken: () => string | undefined) {
    this.baseUrl = baseUrl;
    this.getAuthToken = getAuthToken;
  }

  /**
   * Imports a Penpot binary file (.penpot extension, which is a zip).
   * @param name The name for the imported file.
   * @param projectId The ID of the project to import the file into.
   * @param version The version of the file.
   * @param fileData The binary content of the .penpot file (Uint8Array).
   * @returns A promise that resolves with the API response for the imported file.
   */
  public async importBinfile(
    name: string,
    projectId: UUID,
    version: number,
    fileData: Uint8Array,
  ): Promise<ImportBinfileSuccessResponse> {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("project-id", projectId);
    formData.append("version", version.toString());
    formData.append(
      "file",
      new Blob([fileData], { type: "application/zip" }),
      "blob",
    );

    const additionalHeaders: HeadersInit = {
      "x-external-session-id": "null",
      "x-event-origin": "null",
      Referer: "",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      accept: "application/transit+json,text/event-stream,*/*",
      "x-frontend-version": "2.8.0-RC9",
    };

    return await request<ImportBinfileSuccessResponse>(
      this.baseUrl,
      "/command/import-binfile",
      "POST",
      formData,
      "multipart/form-data", // This is informative; request handles it for FormData
      additionalHeaders,
      this.getAuthToken(), // Pass the auth-token
    );
  }

  /**
   * Exports a Penpot file in binary format (.penpot zip).
   * @param fileId The ID of the file to export.
   * @param version The version of the file to export.
   * @param includeLibraries Whether to include libraries in the export.
   * @param embedAssets Whether to embed assets in the export.
   * @returns A Promise that resolves with the binary data (ArrayBuffer) of the exported file.
   */
  public async exportBinfile(
    fileId: UUID,
    version: number,
    includeLibraries: boolean,
    embedAssets: boolean,
  ): Promise<ArrayBuffer> {
    const requestBody = {
      "~:file-id": `~u${fileId}`,
      "~:version": version,
      "~:include-libraries": includeLibraries,
      "~:embed-assets": embedAssets,
    };

    const additionalHeaders: HeadersInit = {
      "x-external-session-id": "null",
      "x-event-origin": "null",
      Referer: "",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      accept: "application/transit+json,text/event-stream,*/*",
      "content-type": "application/transit+json",
      "x-frontend-version": "2.8.0-RC9",
    };

    return await request<ArrayBuffer>(
      this.baseUrl,
      "/command/export-binfile",
      "POST",
      requestBody,
      "application/transit+json",
      additionalHeaders,
      this.getAuthToken(), // Pass the auth-token
    );
  }
}