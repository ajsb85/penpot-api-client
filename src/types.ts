/**
 * @file This module exports all the public types generated from the OpenAPI specification,
 * along with custom type aliases for improved readability and ergonomic use within the Penpot API client.
 *
 * @remarks
 * Consuming this entry point (`@your-scope/penpot-api/types`) allows you to
 * access the API's data structures without importing the client's runtime code.
 * This file serves as a central hub for type definitions, ensuring type safety
 * across all interactions with the Penpot API.
 *
 * @packageDocumentation
 */

import type { components, paths } from "./client/generated/types.ts";

/**
 * Re-exports all generated OpenAPI components (schemas).
 * These types represent the data models used in API requests and responses.
 * @type {components}
 */
export type { components };

/**
 * Re-exports all generated OpenAPI paths.
 * These types represent the request and response structures for specific API endpoints.
 * @type {paths}
 */
export type { paths };

// --- Custom, more ergonomic type aliases ---

/**
 * A universally unique identifier (UUID) string, commonly used for Penpot entities like files, projects, and users.
 * This alias points to the `appCommonSchema$uuid` schema from the generated OpenAPI types.
 * @typedef {components["schemas"]["appCommonSchema$uuid"]} Uuid
 */
export type Uuid = components["schemas"]["appCommonSchema$uuid"];

/**
 * Represents a Penpot file object, as returned by the `get-file` command.
 * This type is derived from the specific response structure of the `/command/get-file` endpoint.
 * @typedef {paths["/command/get-file"]["post"]["responses"]["default"]["content"]["application/json"]} PenpotFile
 */
export type PenpotFile =
  paths["/command/get-file"]["post"]["responses"]["default"]["content"]["application/json"];

/**
 * Represents a user profile, as returned by the `get-profile` command.
 * This type is derived from the specific response structure of the `/command/get-profile` endpoint.
 * @typedef {paths["/command/get-profile"]["post"]["responses"]["default"]["content"]["application/json"]} UserProfile
 */
export type UserProfile =
  paths["/command/get-profile"]["post"]["responses"]["default"]["content"]["application/json"];

/**
 * Represents the permissions mixin, defining access rights (e.g., `isOwner`, `isAdmin`, `canEdit`).
 * This type is sourced from the `appRpcPermissions$permissions` schema in the generated OpenAPI types.
 * @typedef {components["schemas"]["appRpcPermissions$permissions"]} Permissions
 */
export type Permissions =
  components["schemas"]["appRpcPermissions$permissions"];
