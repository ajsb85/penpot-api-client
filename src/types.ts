/**
 * @file This module exports all the public types generated from the OpenAPI specification,
 * along with custom type aliases for improved readability and ergonomic use within the Penpot API client.
 *
 * @remarks
 * Consuming this entry point (`@ajsb85/penpot-api-client/types`) allows you to
 * access the API's data structures without importing the client's runtime code.
 * This file serves as a central hub for type definitions, ensuring type safety
 * across all interactions with the Penpot API.
 *
 * @module
 * @packageDocumentation
 */

import type { components, paths } from "./client/generated/types.ts";

/**
 * Re-exports all generated OpenAPI components (schemas).
 * These types represent the data models used in API requests and responses.
 * They are automatically generated from the `openapi.json` specification
 * and provide the foundational structure for Penpot entities.
 * @type {components}
 */
export type { components };

/**
 * Re-exports all generated OpenAPI paths.
 * These types represent the request and response structures for specific API endpoints.
 * They define the exact shapes of request bodies and response payloads for each API command.
 * @type {paths}
 */
export type { paths };

// --- Custom, more ergonomic type aliases ---

/**
 * A universally unique identifier (UUID) string, commonly used for Penpot entities
 * such as files, projects, users, and various design objects.
 *
 * This alias points directly to the `appCommonSchema$uuid` schema from the
 * auto-generated OpenAPI types, providing a more convenient and readable type name.
 * @typedef {components["schemas"]["appCommonSchema$uuid"]} Uuid
 * @example
 * ```ts
 * const fileId: Uuid = "a03ea8b8-fc8a-8124-8006-78afc425ce80";
 * ```
 */
export type Uuid = components["schemas"]["appCommonSchema$uuid"];

/**
 * Represents a Penpot file object, encapsulating its metadata and content structure.
 * This type is derived from the specific response structure of the `/command/get-file` endpoint.
 * It includes properties like file ID, name, project ID, and various features and permissions.
 * @typedef {paths["/command/get-file"]["post"]["responses"]["default"]["content"]["application/json"]} PenpotFile
 * @see {@link https://design.penpot.app/api-docs/index.html#/Files/get-file}
 * @example
 * ```ts
 * import type { PenpotFile } from "@ajsb85/penpot-api-client/types";
 *
 * const myFile: PenpotFile = {
 * id: "file-123",
 * name: "My Design System",
 * projectId: "project-abc",
 * createdAt: "2023-01-01T10:00:00Z",
 * modifiedAt: "2023-01-05T15:30:00Z",
 * revn: 10,
 * vern: 3,
 * isShared: false,
 * hasMediaTrimmed: true,
 * commentThreadSeqn: 5,
 * features: new Set(["components/v2", "layout/grid"]),
 * permissions: {
 * type: "owner",
 * isOwner: true,
 * isAdmin: true,
 * canEdit: true,
 * canRead: true,
 * isLogged: true
 * },
 * data: { /* ... file content structure ... *\/ }
 * };
 * ```
 */
export type PenpotFile =
  paths["/command/get-file"]["post"]["responses"]["default"]["content"]["application/json"];

/**
 * Represents a user profile object within the Penpot system.
 * This type is derived from the specific response structure of the `/command/get-profile` endpoint.
 * It contains details such as the user's ID, full name, email, and various account properties.
 * @typedef {paths["/command/get-profile"]["post"]["responses"]["default"]["content"]["application/json"]} UserProfile
 * @see {@link https://design.penpot.app/api-docs/index.html#/Auth/get-profile}
 * @example
 * ```ts
 * import type { UserProfile } from "@ajsb85/penpot-api-client/types";
 *
 * const currentUser: UserProfile = {
 * id: "user-456",
 * fullname: "Jane Doe",
 * email: "jane.doe@example.com",
 * isActive: true,
 * isBlocked: false,
 * isDemo: false,
 * isMuted: false,
 * createdAt: "2022-10-20T09:00:00Z",
 * modifiedAt: "2023-03-15T11:45:00Z",
 * defaultProjectId: "drafts-project-id",
 * defaultTeamId: "my-team-id",
 * props: {
 * v2InfoShown: true,
 * notifications: {
 * dashboardComments: "all",
 * emailComments: "partial",
 * emailInvites: "all"
 * }
 * }
 * };
 * ```
 */
export type UserProfile =
  paths["/command/get-profile"]["post"]["responses"]["default"]["content"]["application/json"];

/**
 * Represents the permissions mixin, defining access rights for a user
 * on a specific resource (e.g., a file, a team).
 * This type is sourced from the `appRpcPermissions$permissions` schema in the generated OpenAPI types.
 * It typically includes boolean flags indicating ownership, administrative rights, and editing/reading capabilities.
 * @typedef {components["schemas"]["appRpcPermissions$permissions"]} Permissions
 * @example
 * ```ts
 * import type { Permissions } from "@ajsb85/penpot-api-client/types";
 *
 * const filePermissions: Permissions = {
 * type: "share-link",
 * isOwner: false,
 * isAdmin: false,
 * canEdit: false,
 * canRead: true,
 * isLogged: true
 * };
 *
 * const teamPermissions: Permissions = {
 * type: "membership",
 * isOwner: true,
 * isAdmin: true,
 * canEdit: true,
 * canRead: true,
 * isLogged: true
 * };
 * ```
 */
export type Permissions =
  components["schemas"]["appRpcPermissions$permissions"];
