// src/client/auth.ts

import type { UUID } from "./generated/types.ts"; // Correct path for UUID type

// Define Email type as a string for clarity
export type Email = string;

/**
 * Represents the user profile data returned upon successful login.
 * Based on observed API responses.
 */
export interface UserProfileResponse {
  "~:is-admin": boolean;
  "~:email": Email;
  "~:is-demo": boolean;
  "~:auth-backend": string;
  "~:fullname": string;
  "~:modified-at": string; // Transit timestamp (~m)
  "~:theme": string;
  "~:is-active": boolean;
  "~:default-project-id"?: UUID;
  "~:id": UUID;
  "~:is-muted": boolean;
  "~:default-team-id"?: UUID;
  "~:created-at": string; // Transit timestamp (~m)
  "~:is-blocked": boolean;
  "~:props": {
    "~:v2-info-shown"?: boolean;
    "~:given_name"?: string;
    "~:onboarding-viewed"?: boolean;
    "~:accept-newsletter-subscription"?: boolean;
    "~:accept-terms-and-privacy"?: boolean;
    "~:locale"?: string;
    "~:sub"?: string;
    "~:workspace-visited"?: boolean;
    "~:email_verified"?: boolean;
    "~:family_name"?: string;
    "~:picture"?: string;
    "~:release-notes-viewed"?: string;
  };
}

// Response for successful file import (from SSE 'end' event)
export interface ImportBinfileSuccessResponse {
  fileId: UUID; // The UUID of the newly imported file
}
