# @ajsb85/penpot-api-client

A modern, multi-runtime, and type-safe API client for Penpot, meticulously engineered for seamless integration across Deno, Node.js, Bun, and web browsers. This library offers a robust and highly structured interface for programmatic interaction with the Penpot API, encompassing authentication, file management, and project operations.

[](https://jsr.io/@ajsb85/penpot-api-client)
[](https://www.google.com/search?q=https://github.com/ajsb85/penpot-api-client/blob/main/LICENSE)

## ✨ Features

* **Multi-Runtime Compatibility:** Engineered to function consistently across diverse JavaScript environments, including Deno, Node.js, Bun, and modern web browsers.
* **Comprehensive Type Safety:** Developed with TypeScript, providing exhaustive type definitions for all API requests, responses, and error structures, thereby enhancing code reliability and developer productivity.
* **Modular API Services:** Organized into distinct service clients (e.g., `AuthApi`, `FilesApi`) for clear separation of concerns and improved API discoverability.
* **Structured Error Handling:** Implements custom error classes (`ApiError`, `ApiHttpError`, `ApiClientError`) to provide detailed and consistent error information, facilitating robust error management.
* **Configurable Client Behavior:** Offers extensive configuration options for `baseUrl`, `accessToken`, request timeouts, and custom HTTP headers.
* **Extensible Request Pipeline:** Supports the integration of custom middleware for advanced functionalities such as logging, caching, or request/response manipulation.

## 🚀 Installation

This package is officially published on [JSR](https://jsr.io/@ajsb85/penpot-api-client).

### Deno

```bash
deno add @ajsb85/penpot-api-client
```

Alternatively, you may import directly:

```typescript
import { PenpotClient } from "jsr:@ajsb85/penpot-api-client@^1.0.2";
```

### Node.js / Bun

```bash
npm install @ajsb85/penpot-api-client
# or
yarn add @ajsb85/penpot-api-client
# or
pnpm add @ajsb85/penpot-api-client
# or
bun add @ajsb85/penpot-api-client
```

Then, import the client:

```typescript
import { PenpotClient } from "@ajsb85/penpot-api-client";
```

### Browsers

For browser environments, you can leverage a CDN that supports JSR modules or bundle the library using a compatible bundler (e.g., Webpack, Rollup, esbuild).

Using JSR's CDN:

```html
<script type="module">
  import { PenpotClient } from "https://jsr.io/@ajsb85/penpot-api-client@^1.0.2/src/index.ts";

  // Your application logic here
  const client = new PenpotClient({
    baseUrl: "https://design.penpot.app/api/rpc",
    accessToken: "your_personal_access_token",
  });
</script>
```

## 📖 Usage

To begin interacting with the Penpot API, initialize the `PenpotClient` with your Penpot instance's API base URL and a valid [Personal Access Token](https://help.penpot.app/user-guide/personal-access-tokens/). The API base URL for RPC commands is typically `https://<your-penpot-domain>/api/rpc`.

```typescript
import { PenpotClient } from "@ajsb85/penpot-api-client"; // or "jsr:@ajsb85/penpot-api-client" for Deno
import { ApiHttpError } from "@ajsb85/penpot-api-client/client/errors"; // For robust error handling
import type { UserProfile } from "@ajsb85/penpot-api-client/types"; // For type safety

async function fetchCurrentUserProfile(): Promise<void> {
  // Initialize the PenpotClient
  const client = new PenpotClient({
    baseUrl: "https://design.penpot.app/api/rpc", // Replace with your Penpot instance's RPC API base URL
    accessToken: "your_personal_access_token_here", // Obtain from your Penpot user settings
    debug: true, // Optional: Set to true for verbose request/response logging
  });

  try {
    // Fetch the profile of the currently authenticated user
    const { data: userProfile, error: profileError } = await client.auth.getProfile().exec();

    if (userProfile) {
      console.log("Successfully fetched user profile:");
      console.log(`- ID: ${userProfile.id}`);
      console.log(`- Full Name: ${userProfile.fullname}`);
      console.log(`- Email: ${userProfile.email}`);
    } else if (profileError) {
      console.error("Failed to fetch user profile:");
      console.error(`- Message: ${profileError.message}`);
      console.error(`- Type: ${profileError.name}`);
      if (profileError.cause) {
        console.error(`- Cause:`, profileError.cause);
      }
    }
  } catch (error) {
    // Catch any unexpected errors during client initialization or API call execution
    console.error("An unhandled exception occurred:", error);
  }
}

// Execute the example function
fetchCurrentUserProfile();
```

## 📚 API Documentation

The entirety of the codebase is meticulously documented using TSDoc comments, providing comprehensive API reference information. For detailed API specifications, including all available types, methods, and their parameters, please refer to the official JSR package page.

[View Full API Documentation on JSR](https://jsr.io/@ajsb85/penpot-api-client)

## 🤝 Contributing

Contributions to this project are welcome. Should you identify a bug, propose a feature enhancement, or wish to contribute code, please engage via the [GitHub repository](https://www.google.com/search?q=https://github.com/ajsb85/penpot-api-client/issues). Adherence to established coding standards and submission guidelines is appreciated.

## 📄 License

This project is released under the [MIT License](https://www.google.com/search?q=https://github.com/ajsb85/penpot-api-client/blob/main/LICENSE). A copy of the license is included in the repository for full terms and conditions.
