// src/scripts/generate_client.ts

import { join } from "jsr:@std/path";
import { ensureDir } from "jsr:@std/fs";

const OPENAPI_PATH = "./openapi.json";
const GENERATED_DIR = "./src/client/generated/";

// --- Helper function to convert OpenAPI schema types to TypeScript types ---
function openApiTypeToTsType(
  schema: any,
  required: boolean = false,
  context: string = ""
): string {
  if (!schema) return "unknown";

  if (schema.$ref) {
    const refName = schema.$ref.split("/").pop();
    switch (refName) {
      case "appCommonSchema$uuid":
        return "UUID";
      case "appCommonSchema$email":
        return "Email";
      case "appCommonSchema$boolean":
        return "boolean";
      case "appCommonSchema$int":
      case "appCommonSchema$safe-int":
      case "appCommonSchema$safe-number":
        return "number";
      case "appUtilTime$instant":
        return "string"; // ISO date string
      case "appUtilTime$duration":
        return "string"; // Duration string
      case "appCommonSchema$text":
      case "appCommonSchema$word-string":
      case "appCommonSchema$uri":
        return "string";
      case "appCommonSchema$any":
        return "any"; // Fallback for 'any' type
      case "appMedia$upload":
        return "AppMediaUpload"; // Specific upload type, handled by Blob/Uint8Array
      case "appCommonFeatures$features":
        return "string[]"; // Set of strings
      case "appCommonTypesTeam$role":
        return "string"; // Roles are usually strings ("owner", "editor")
      case "appCommonGeomPoint$point":
        return "{ x: number; y: number; }"; // Simple inline type for point
      case "appCommonTypesPlugins$plugin-data":
        return "Record<string, unknown>";
      case "appCommonFilesChanges$change":
        return "AppCommonFilesChangesChange"; // Complex union type, simplify as custom interface

      case "Profile":
        return "UserProfileResponse"; // Our custom name for the login profile
      case "File":
        return "FileSchema"; // File from get-project-files/get-team-recent-files
      case "PermissionsMixin":
        return "PermissionsMixin"; // File from get-file
      case "Project":
        return "ProjectSchema"; // Project from get-projects/create-project

      default:
        // Convert typical OpenAPI schema names to PascalCase TypeScript interface names
        // e.g., 'my-schema-name' -> 'MySchemaName'
        const tsName = refName
          .replace(/^[a-z]+[A-Z_]*\$/, "") // Remove prefixes like appCommonSchema$
          .replace(/-([a-z])/g, (_, char) => char.toUpperCase()) // kebab-case to camelCase
          .replace(/^(.)/, (match) => match.toUpperCase()); // First letter to uppercase
        return tsName;
    }
  }

  switch (schema.type) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      const itemType = openApiTypeToTsType(
        schema.items,
        false,
        `${context}.items`
      );
      return `${itemType}[]`;
    case "object":
      if (schema.additionalProperties && schema.additionalProperties !== true)
        return `Record<string, ${openApiTypeToTsType(
          schema.additionalProperties,
          false,
          `${context}.additionalProperties`
        )}>`;
      if (schema.properties && Object.keys(schema.properties).length > 0)
        return `{\n${Object.entries(schema.properties)
          .map(([propName, propSchema]: [string, any]) => {
            const isPropRequired = (schema.required || []).includes(propName);
            const tsPropName = propName.replace(/-([a-z])/g, (_, char) =>
              char.toUpperCase()
            ); // Convert kebab-case to camelCase
            const tsType = openApiTypeToTsType(
              propSchema,
              isPropRequired,
              `${context}.${propName}`
            );
            return `  ${tsPropName}${isPropRequired ? "" : "?"}: ${tsType};`;
          })
          .join("\n")}\n}`;
      return "Record<string, unknown>"; // Generic object if no specific properties
    case "null":
      return "null";
    case undefined: // Could be oneOf/allOf directly at the top level
      if (schema.oneOf || schema.allOf || schema.anyOf) {
        // For complex unions/intersections, we'll try to get the first type or default to unknown
        if (schema.oneOf && schema.oneOf.length > 0)
          return openApiTypeToTsType(schema.oneOf[0], required, context);
        if (schema.allOf && schema.allOf.length > 0)
          return openApiTypeToTsType(schema.allOf[0], required, context);
        if (schema.anyOf && schema.anyOf.length > 0)
          return openApiTypeToTsType(schema.anyOf[0], required, context);
      }
      return "any"; // Default for unhandled complex types
    default:
      return "any"; // Fallback for any other unhandled type
  }
}

// --- Main Generation Function ---
async function generateClient() {
  console.log("Starting Penpot API client generation from openapi.json...");

  await ensureDir(GENERATED_DIR);

  const openapiSpecContent = await Deno.readTextFile(OPENAPI_PATH);
  const openapiSpec = JSON.parse(openapiSpecContent);

  let typesTsContent = `// src/client/generated/types.ts\n// AUTOMATICALLY GENERATED - DO NOT EDIT MANUALLY\n\n`;

  // --- Basic Common Types (Always needed or mapped) ---
  typesTsContent += `export type UUID = string;\n`;
  // Email is handled by src/client/auth.ts
  // Boolean, Number, String are direct JS types
  typesTsContent += `// Note: Email, UserProfileResponse, ImportBinfileSuccessResponse are in ../auth.ts\n`;
  typesTsContent += `// Boolean, Number, String are native JS types\n\n`;

  // --- 1. Generate Interfaces from components.schemas ---
  const generatedInterfaceNames = new Set<string>(); // Keep track of names to avoid re-exporting native types

  if (openapiSpec.components && openapiSpec.components.schemas) {
    for (const schemaName in openapiSpec.components.schemas) {
      const schema = openapiSpec.components.schemas[schemaName];
      let tsInterfaceName = mapOpenApiRefToTsType(
        `#/components/schemas/${schemaName}`
      );

      // Skip if it's a native type or already handled as a specific mapping
      if (
        [
          "UUID",
          "Email",
          "boolean",
          "number",
          "string",
          "any",
          "AppMediaUpload",
          "UserProfileResponse",
        ].includes(tsInterfaceName)
      ) {
        continue;
      }
      generatedInterfaceNames.add(tsInterfaceName); // Add to set of names for types.ts

      // Special handling for the Profile schema to match actual API response keys (Transit array-map)
      if (schemaName === "Profile") {
        typesTsContent += `// Special mapping for UserProfileResponse due to Transit array-map conversion\n`;
        typesTsContent += `// Keys reflect the literal string keys from the Transit JSON response.\n`;
        typesTsContent += `export interface UserProfileResponse {\n`;
        const profileProperties = schema.properties || {};
        const requiredProps = schema.required || [];

        const transitKeysMap: Record<string, string> = {
          id: "~:id",
          fullname: "~:fullname",
          email: "~:email",
          isActive: "~:is-active",
          isBlocked: "~:is-blocked",
          isDemo: "~:is-demo",
          isMuted: "~:is-muted",
          createdAt: "~:created-at",
          modifiedAt: "~:modified-at",
          defaultProjectId: "~:default-project-id",
          defaultTeamId: "~:default-team-id",
          props: "~:props",
          authBackend: "~:auth-backend", // from login response
          isAdmin: "~:is-admin", // from login response
          // Add other properties from profile if needed (e.g., 'locale', 'sub', 'given_name' from props)
        };

        for (const propKey in transitKeysMap) {
          const transitKey = transitKeysMap[propKey];
          const originalProp = profileProperties[propKey];
          if (originalProp) {
            const tsType = mapOpenApiPropertyToTsType(originalProp);
            const isOptional = !requiredProps.includes(propKey);
            typesTsContent += `  "${transitKey}": ${tsType}${
              isOptional ? " | null" : ""
            };\n`;
          }
        }
        typesTsContent += `}\n\n`;
        continue; // Skip default generation for Profile
      }

      // Default interface generation for other schemas
      typesTsContent += `export interface ${tsInterfaceName} {\n`;
      const properties = schema.properties || {};
      const required = schema.required || [];
      for (const propName in properties) {
        const prop = properties[propName];
        const tsType = mapOpenApiPropertyToTsType(prop);
        const isOptional = !required.includes(propName);
        const cleanedPropName = propName
          .replace(/-([a-z])/g, (_, char) => char.toUpperCase())
          .replace(/^(.)/, (m) => m.toLowerCase()); // ensure camelCase
        typesTsContent += `  ${cleanedPropName}${
          isOptional ? "?" : ""
        }: ${tsType};\n`;
      }
      if (schema.additionalProperties && schema.additionalProperties !== true) {
        const addPropType = mapOpenApiPropertyToTsType(
          schema.additionalProperties
        );
        typesTsContent += `  [key: string]: ${addPropType};\n`;
      }
      typesTsContent += `}\n\n`;
    }
  }
  // Explicitly define AppMediaUpload, AppCommonFilesChangesChange, etc. if they are complex or file types
  typesTsContent += `// Complex types that may need specific mapping (check openapi.json)\n`;
  typesTsContent += `export type AppMediaUpload = unknown; // Represents a file upload, often Blob or Uint8Array\n`;
  typesTsContent += `export type AppCommonFilesChangesChange = unknown; // Complex change object\n`;
  typesTsContent += `export type AppCommonGeomPointPoint = { x: number; y: number; }; // Re-define as object for clarity\n`;
  typesTsContent += `export type PermissionsMixin = unknown; // Complex type for get-file response, simplify\n`;
  typesTsContent += `export type ProjectSchema = { id: UUID; name: string; /* other common project properties */ };\n`; // For create/get project
  typesTsContent += `export type FileSchema = { id: UUID; name: string; /* other common file properties */ };\n`; // For get-project-files

  await Deno.writeTextFile(join(GENERATED_DIR, "types.ts"), typesTsContent);
  console.log("Generated src/client/generated/types.ts");

  // --- 2. Generate API Classes and Methods ---
  const apiClasses: Record<
    string,
    { methods: string[]; imports: Set<string>; filePath: string }
  > = {
    AuthApi: {
      methods: [],
      imports: new Set(["request", "Email", "UserProfileResponse"]),
      filePath: "auth_api.ts",
    },
    FilesApi: {
      methods: [],
      imports: new Set([
        "request",
        "UUID",
        "ImportBinfileSuccessResponse",
        "FileSchema",
        "PermissionsMixin",
      ]),
      filePath: "files_api.ts",
    },
    ProjectsApi: {
      methods: [],
      imports: new Set(["request", "UUID", "ProjectSchema"]),
      filePath: "projects_api.ts",
    },
    // Add more API classes based on your path structure and `openapi.json` tags/organization
    OtherApi: {
      methods: [],
      imports: new Set(["request"]),
      filePath: "other_api.ts",
    }, // Catch-all for unassigned commands
  };

  if (openapiSpec.paths) {
    for (const path in openapiSpec.paths) {
      const pathObj = openapiSpec.paths[path];
      for (const method in pathObj) {
        // 'post', 'get' etc.
        const operation = pathObj[method];
        if (!operation.operationId) {
          console.warn(
            `Skipping path ${path} method ${method}: No operationId found.`
          );
          continue;
        }

        let className: string = "OtherApi"; // Default to OtherApi if no specific match
        let methodName = operation.operationId
          .replace(/-([a-z])/g, (_, char) => char.toUpperCase())
          .replace(/^(.)/, (match) => match.toLowerCase()); // camelCase method name

        // --- Assign to specific API classes based on path prefixes or content ---
        if (
          path.startsWith("/command/login-with-password") ||
          path.startsWith("/command/get-profile")
        ) {
          className = "AuthApi";
        } else if (path.includes("file") || path.includes("media")) {
          // Broad match for files
          className = "FilesApi";
        } else if (path.includes("project")) {
          // Broad match for projects
          className = "ProjectsApi";
        }
        // Add more specific logic for other API groups

        const classData = apiClasses[className];
        if (!classData) {
          // Should not happen with 'OtherApi' fallback, but for safety
          console.error(
            `Error: API class for ${path} not defined: ${className}`
          );
          continue;
        }
        const imports = classData.imports;

        // --- Method Parameters and Request Body ---
        let tsParams: string[] = [];
        let requestBodyVar: string = "requestBody"; // Default variable name for JSON body
        let requestContentType: string = "application/json";
        let methodBodyContent = ""; // Content of the method body before the request call
        let requestBodyArg = "requestBody"; // What's actually passed to `request` utility

        // Handle requestBody
        if (operation.requestBody && operation.requestBody.content) {
          let reqSchema =
            operation.requestBody.content["application/json"]?.schema;
          if (!reqSchema)
            reqSchema =
              operation.requestBody.content["multipart/form-data"]?.schema;
          if (!reqSchema)
            reqSchema =
              operation.requestBody.content["application/transit+json"]?.schema; // Fallback if transit is explicitly mentioned as reqBody.content

          if (reqSchema && reqSchema.properties) {
            const bodyParams: string[] = [];
            const reqBodyObjName = `${methodName}Request`; // Name for the request body object type

            // Collect method parameters (input arguments for the function)
            for (const propName in reqSchema.properties) {
              const prop = reqSchema.properties[propName];
              const isRequired = (reqSchema.required || []).includes(propName);
              let tsType = mapOpenApiPropertyToTsType(prop);
              const paramName = propName.replace(/-([a-z])/g, (_, char) =>
                char.toUpperCase()
              ); // camelCase for params
              tsParams.push(`${paramName}${isRequired ? "" : "?"}: ${tsType}`);

              // For complex types, ensure their names are imported
              if (tsType.includes("UUID")) imports.add("UUID");
              if (tsType.includes("Email")) imports.add("Email");
              if (tsType.includes("AppMediaUpload"))
                imports.add("AppMediaUpload"); // For upload
            }

            // Determine how the request body is created
            if (
              (isFormData =
                !!operation.requestBody.content["multipart/form-data"])
            ) {
              // For multipart, build FormData
              methodBodyContent += `    const formData = new FormData();\n`;
              for (const propName in reqSchema.properties) {
                const paramName = propName.replace(/-([a-z])/g, (_, char) =>
                  char.toUpperCase()
                );
                const prop = reqSchema.properties[propName];
                if (prop.$ref && prop.$ref.endsWith("appMedia$upload")) {
                  // Assuming parameter is passed as `fileData: Uint8Array | Blob` and `fileName: string` if needed
                  // Simplification for our use case: `fileData` for file content, `paramName` from input
                  methodBodyContent += `    formData.append("${propName}", ${paramName} as Blob, "${paramName}.bin"); // Adjust filename as needed\n`;
                } else {
                  methodBodyContent += `    if (${paramName} !== undefined) formData.append("${propName}", ${paramName}.toString());\n`;
                }
              }
              requestBodyArg = "formData";
              requestContentType = "multipart/form-data";
            } else {
              // For JSON bodies, create an object
              methodBodyContent += `    const requestBody = {\n`;
              for (const propName in reqSchema.properties) {
                const paramName = propName.replace(/-([a-z])/g, (_, char) =>
                  char.toUpperCase()
                );
                // Use original kebab-case name for the JSON object key
                // Handle ~: prefixes for specific commands like export-binfile's fileId
                if (
                  operation.operationId === "export-binfile" &&
                  propName === "fileId"
                ) {
                  methodBodyContent += `      "~:file-id": \`~u\${${paramName}}\`,\n`;
                } else if (
                  operation.operationId === "export-binfile" &&
                  (propName === "version" ||
                    propName === "includeLibraries" ||
                    propName === "embedAssets")
                ) {
                  methodBodyContent += `      "~:${propName
                    .replace(/-([a-z])/g, (_, char) => char.toUpperCase())
                    .replace(/^(.)/, (m) =>
                      m.toLowerCase()
                    )}": ${paramName},\n`; // Use original name for value
                } else {
                  methodBodyContent += `      "${propName}": ${paramName},\n`;
                }
              }
              methodBodyContent += `    };\n`;
              requestBodyArg = "requestBody";
              requestContentType = "application/json"; // Default for JSON types
            }
          } else if (reqSchema && reqSchema.$ref) {
            // Request body is a direct reference to another schema (e.g., just an ID)
            const refTypeName = mapOpenApiPropertyToTsType(reqSchema);
            const paramName = `bodyParams`; // Generic name for parameter
            tsParams.push(`${paramName}: ${refTypeName}`);
            requestBodyArg = paramName;
            requestContentType = "application/json";
            if (refTypeName.includes("UUID")) imports.add("UUID"); // Ensure UUID is imported
          }
        }

        // --- Response Type ---
        let responseTypeTs = "any";
        const defaultResponse = operation.responses?.default;
        if (defaultResponse && defaultResponse.content) {
          let resSchema = defaultResponse.content["application/json"]?.schema;
          if (resSchema) {
            responseTypeTs = mapOpenApiPropertyToTsType(resSchema);
          } else if (defaultResponse.content["application/octet-stream"]) {
            responseTypeTs = "ArrayBuffer";
          } else if (defaultResponse.content["text/event-stream"]) {
            // For SSE, the type should be the final result type (e.g., ImportBinfileSuccessResponse)
            if (operation.operationId === "import-binfile") {
              responseTypeTs = "ImportBinfileSuccessResponse";
            } else {
              responseTypeTs = "any"; // Default for other SSE
            }
          }
        }

        // --- Specific Overrides for Return Types/Parameters based on observation ---
        if (operation.operationId === "login-with-password") {
          tsParams = [
            // Explicitly define login params
            `email: Email`,
            `password: string`,
            `invitationToken?: string`,
          ];
          imports.add("Email"); // Ensure Email is imported
          responseTypeTs = "UserProfileResponse"; // Explicitly set correct response type
          imports.add("UserProfileResponse");
        } else if (operation.operationId === "import-binfile") {
          tsParams = [
            // Explicitly define import params
            `name: string`,
            `projectId: UUID`,
            `version: number`,
            `fileData: Uint8Array | Blob`, // File content directly
          ];
          imports.add("UUID"); // Ensure UUID is imported
          responseTypeTs = "ImportBinfileSuccessResponse"; // Explicitly set correct response type
          imports.add("ImportBinfileSuccessResponse");
          requestBodyArg = "formData"; // Ensure formData is used
          requestContentType = "multipart/form-data"; // Ensure multipart
        } else if (operation.operationId === "export-binfile") {
          tsParams = [
            // Explicitly define export params
            `fileId: UUID`,
            `version: number`,
            `includeLibraries: boolean`,
            `embedAssets: boolean`,
          ];
          imports.add("UUID"); // Ensure UUID is imported
          responseTypeTs = "ArrayBuffer"; // Explicitly set correct response type
          // Request body creation needs to be a specific object with ~: keys
          requestBodyCreation = `{
                        "~:file-id": \`~u\${fileId}\`,
                        "~:version": version,
                        "~:include-libraries": includeLibraries,
                        "~:embed-assets": embedAssets
                    }`;
          requestBodyArg = "requestBody"; // Now it's a JSON body
          requestContentType = "application/transit+json"; // Specific transit type
        } else if (operation.operationId === "get-profile") {
          tsParams = []; // No params
          responseTypeTs = "UserProfileResponse";
          imports.add("UserProfileResponse");
        } else if (operation.operationId === "get-file") {
          // Request body is { id: UUID, projectId?: UUID, features?: string[] }
          tsParams = [`id: UUID`, `projectId?: UUID`, `features?: string[]`];
          imports.add("UUID");
          responseTypeTs = "PermissionsMixin"; // From the OpenAPI schema directly
          imports.add("PermissionsMixin");
          requestBodyCreation = `{ id, projectId, features }`;
          requestBodyArg = `requestBody`;
          requestContentType = "application/json";
        } else if (operation.operationId === "get-projects") {
          tsParams = [`teamId: UUID`];
          imports.add("UUID");
          responseTypeTs = "ProjectSchema[]"; // Returns array of ProjectSchema
          imports.add("ProjectSchema");
          requestBodyCreation = `{ teamId }`;
          requestBodyArg = `requestBody`;
          requestContentType = "application/json";
        } else if (operation.operationId === "create-project") {
          tsParams = [`teamId: UUID`, `name: string`];
          imports.add("UUID");
          responseTypeTs = "ProjectSchema"; // Returns ProjectSchema
          imports.add("ProjectSchema");
          requestBodyCreation = `{ teamId, name }`;
          requestBodyArg = `requestBody`;
          requestContentType = "application/json";
        }
        // Add more overrides for other critical endpoints with correct params/return types

        // Build method body for the request call
        let methodCallBody = `
    ${methodBodyContent}
    const additionalHeaders: HeadersInit = ${JSON.stringify({
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      "x-frontend-version": "2.8.0-RC9",
      accept: "application/transit+json,text/event-stream,*/*",
      "x-external-session-id": "null",
      "x-event-origin": "null",
      Referer: "", // As per HAR
      // Override with operation-specific content-type if not multipart
      ...(requestContentType !== "multipart/form-data" && {
        "Content-Type": requestContentType,
      }),
    })};
    return await request<${responseTypeTs}>(
      this.baseUrl,
      "${path}",
      "${method.toUpperCase()}",
      ${requestBodyArg},
      "${requestContentType}", // Pass content type explicitly
      additionalHeaders,
      this.getPersonalAccessToken()
    );`;

        const methodCode = `
  /**
   * ${operation.description || "No description provided."}
   */
  public async ${methodName}(${tsParams.join(
          ", "
        )}): Promise<${responseTypeTs}> {
    ${methodCallBody}
  }`;
        apiClasses[className].methods.push(methodCode);
      }
    }
  }

  // --- 3. Write API Class Files ---
  for (const className in apiClasses) {
    const classData = apiClasses[className];
    const importsForFile = Array.from(classData.imports).filter(
      (name) =>
        ![
          "request",
          "ApiClientError",
          "AuthenticationError",
          "Email",
          "UserProfileResponse",
          "ImportBinfileSuccessResponse",
          "UUID",
          "FileSchema",
          "ProjectSchema",
          "PermissionsMixin",
        ].includes(name)
    ); // Filter out base types/errors/request/known auth types

    const generatedImports =
      importsForFile.length > 0
        ? `import type { ${Array.from(generatedInterfaceNames)
            .filter((n) => importsForFile.includes(n))
            .join(", ")} } from "./types.ts";\n`
        : "";

    let classFileContent = `// src/client/generated/${className.toLowerCase()}.ts\n// AUTOMATICALLY GENERATED - DO NOT EDIT MANUALLY\n\n`;
    classFileContent += `import { request } from "../_internals/mod.ts";\n`; // Always import request utility

    // Import specific types based on usage
    if (className === "AuthApi") {
      classFileContent += `import type { Email, UserProfileResponse } from "../auth.ts";\n`;
    } else if (className === "FilesApi") {
      classFileContent += `import type { UUID } from "./types.ts";\n`; // UUID is generated types
      classFileContent += `import type { ImportBinfileSuccessResponse } from "../auth.ts";\n`; // Import from auth.ts
      // Add FileSchema, PermissionsMixin if needed here
      classFileContent += `import type { FileSchema, PermissionsMixin } from "./types.ts";\n`;
    } else if (className === "ProjectsApi") {
      classFileContent += `import type { UUID } from "./types.ts";\n`;
      classFileContent += `import type { ProjectSchema } from "./types.ts";\n`;
    }
    // Add more specific imports for other generated types that might be used

    classFileContent += generatedImports; // Add other generated imports if any
    classFileContent += `\n`;

    classFileContent += `export class ${className} {\n`;
    classFileContent += `  private baseUrl: string;\n`;
    classFileContent += `  private getPersonalAccessToken: () => string | undefined;\n`;
    classFileContent += `  private setPersonalAccessToken?: (token: string) => void;\n\n`; // Add optional setter for AuthApi

    classFileContent += `  constructor(baseUrl: string, getPersonalAccessToken: () => string | undefined, setPersonalAccessToken?: (token: string) => void) {\n`;
    classFileContent += `    this.baseUrl = baseUrl;\n`;
    classFileContent += `    this.getPersonalAccessToken = getPersonalAccessToken;\n`;
    classFileContent += `    this.setPersonalAccessToken = setPersonalAccessToken;\n`;
    classFileContent += `  }\n\n`;

    classFileContent += classData.methods.join("\n");
    classFileContent += "\n}\n";

    await Deno.writeTextFile(
      join(GENERATED_DIR, `${classData.filePath}`),
      classFileContent
    );
    console.log(`Generated src/client/generated/${classData.filePath}`);
  }

  // --- 4. Generate src/client/generated/mod.ts (Re-exports) ---
  let generatedModTsContent = `// src/client/generated/mod.ts\n// AUTOMATICALLY GENERATED - DO NOT EDIT MANUALLY\n\n`;
  generatedModTsContent += `export * from "./types.ts";\n`;
  for (const className in apiClasses) {
    generatedModTsContent += `export * from "./${apiClasses[className].filePath}";\n`;
  }
  await Deno.writeTextFile(
    join(GENERATED_DIR, "mod.ts"),
    generatedModTsContent
  );
  console.log("Generated src/client/generated/mod.ts");

  console.log("\nPenpot API client generation complete!");
  console.log("Remember to run 'deno fmt' and 'deno lint' on generated files.");
}

// Run the generation script
if (import.meta.main) {
  generateClient();
}
