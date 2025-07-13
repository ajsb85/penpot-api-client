// src/client/generated/projects_api.ts
// AUTOMATICALLY GENERATED - DO NOT EDIT MANUALLY

import { request as _request } from "../_internals/mod.ts";
import type { UUID as _UUID } from "./types.ts";

export class ProjectsApi {
  private baseUrl: string;
  private getAuthToken: () => string | undefined; // Renamed from getPersonalAccessToken

  constructor(baseUrl: string, getAuthToken: () => string | undefined) {
    this.baseUrl = baseUrl;
    this.getAuthToken = getAuthToken;
  }

  // Example:
  // public async getProject(projectId: _UUID): Promise<any> { // Use _UUID here
  //   return await _request(this.baseUrl, "/command/get-project", "POST", { id: projectId }, "application/json", {}, this.getAuthToken()); // Use _request here
  // }

  // Other project-related generated methods would go here
}