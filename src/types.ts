/**
 * This module exports all the public types generated from the OpenAPI specification.
 * Consuming this entry point (`@your-scope/penpot-api/types`) allows you to
 * access the API's data structures without importing the client's runtime code.
 *
 * @module
 */

import type { components, paths } from "./client/generated/types.ts";

/** Re-export all generated components (schemas). */
export type { components };

/** Re-export all generated paths. */
export type { paths };

// --- Custom, more ergonomic type aliases ---
// FIX: Pointed all aliases to the correct, namespaced type definitions
// found in the auto-generated types.ts file.

/** A universally unique identifier (UUID) string. */
export type Uuid = components["schemas"]["appCommonSchema$uuid"];

/** Represents a Penpot file object, as returned by the get-file command. */
export type PenpotFile =
  paths["/command/get-file"]["post"]["responses"]["default"]["content"][
    "application/json"
  ];

/** Represents a user profile, as returned by the get-profile command. */
export type UserProfile =
  paths["/command/get-profile"]["post"]["responses"]["default"]["content"][
    "application/json"
  ];

/** Represents the permissions mixin. */
export type Permissions =
  components["schemas"]["appRpcPermissions$permissions"];
