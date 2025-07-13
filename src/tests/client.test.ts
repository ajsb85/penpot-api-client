// src/tests/client.test.ts

import { assertEquals, assertRejects, assertThrows } from "jsr:@std/assert";
// --- FIX: Corrected import path for PenpotClient ---
import {
  PenpotClient,
  ApiClientError,
  AuthenticationError,
  UUID,
  UserProfileResponse,
  ImportBinfileSuccessResponse,
} from "../client/mod.ts";
// ---------------------------------------------------

// Mock Deno.fetch for testing
const originalFetch = globalThis.fetch;

// --- Helper Functions for Mocking Fetch Responses ---

// Mocks a generic JSON response
function mockJsonResponse(
  status: number,
  body: unknown,
  headers: HeadersInit = { "Content-Type": "application/json" }
) {
  globalThis.fetch = (_input: RequestInfo | URL, _init?: RequestInit) => {
    return Promise.resolve(
      new Response(JSON.stringify(body), { status, headers })
    );
  };
}

// Mocks a binary response (ArrayBuffer)
function mockBinaryResponse(
  status: number,
  buffer: ArrayBuffer,
  headers: HeadersInit = { "Content-Type": "application/octet-stream" }
) {
  globalThis.fetch = (_input: RequestInfo | URL, _init?: RequestInit) => {
    return Promise.resolve(new Response(buffer, { status, headers }));
  };
}

// Mocks an SSE response (text/event-stream)
function mockSseResponse(
  status: number,
  sseContent: string,
  headers: HeadersInit = { "Content-Type": "text/event-stream" }
) {
  globalThis.fetch = (_input: RequestInfo | URL, _init?: RequestInit) => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseContent));
        controller.close();
      },
    });
    return Promise.resolve(new Response(stream, { status, headers }));
  };
}

// Mocks a network error (e.g., no internet)
function mockNetworkError(error: Error) {
  globalThis.fetch = (_input: RequestInfo | URL, _init?: RequestInit) => {
    return Promise.reject(error);
  };
}

// --- Test Suite ---

Deno.test("PenpotClient - Initialization and Token Management", async (t) => {
  await t.step("should initialize correctly with no token", () => {
    const client = new PenpotClient("http://localhost:8000");
    assertEquals(client instanceof PenpotClient, true);
    assertEquals(client.getPersonalAccessToken(), undefined);
  });

  await t.step("should initialize correctly with a token", () => {
    const mockToken = "initial-token-123";
    const client = new PenpotClient("http://localhost:8000", mockToken);
    assertEquals(client.getPersonalAccessToken(), mockToken);
  });

  await t.step("should set and get personal access token", () => {
    const client = new PenpotClient("http://localhost:8000");
    const newToken = "new-token-456";
    client.setPersonalAccessToken(newToken);
    assertEquals(client.getPersonalAccessToken(), newToken);
  });

  await t.step(
    "should use provided personal access token in requests",
    async () => {
      const mockToken = "test-personal-token-abc";
      const client = new PenpotClient("http://localhost:8000", mockToken);

      globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        assertEquals(headers.get("Authorization"), `Bearer ${mockToken}`);
        return Promise.resolve(
          new Response(JSON.stringify({ message: "OK" }), { status: 200 })
        );
      };

      await client.files.exportBinfile("some-uuid" as UUID, 3, true, false);

      globalThis.fetch = originalFetch; // Restore original fetch
    }
  );
});

Deno.test(
  "PenpotClient - AuthApi (loginWithPassword & getProfile)",
  async (t) => {
    const client = new PenpotClient("http://localhost:8000"); // No initial token, as login sets it if successful (though not for PAT)

    await t.step(
      "loginWithPassword should handle successful login and parse Transit JSON profile",
      async () => {
        // Mimic the actual Transit JSON array-map response
        const mockProfileTransitArray = [
          "^ ",
          "~:is-admin",
          false,
          "~:email",
          "test@example.com",
          "~:fullname",
          "Test User",
          "~:id",
          "~u12345-login-uuid",
          "~:auth-backend",
          "password",
          "~:modified-at",
          "~m1678886400000",
        ];
        mockJsonResponse(200, mockProfileTransitArray, {
          "Content-Type": "application/transit+json",
        });

        const profile = await client.loginWithPassword(
          "test@example.com",
          "password"
        );

        assertEquals(profile?.["~:id"], "~u12345-login-uuid");
        assertEquals(profile?.["~:email"], "test@example.com");
        assertEquals(profile?.["~:fullname"], "Test User");

        globalThis.fetch = originalFetch;
      }
    );

    await t.step(
      "loginWithPassword should throw AuthenticationError on 401",
      async () => {
        mockJsonResponse(401, {
          "~:type": "~:authentication",
          "~:code": "~:authentication-required",
        });

        await assertRejects(
          () => client.loginWithPassword("test@example.com", "wrongpass"),
          AuthenticationError,
          "API call to /command/login-with-password failed with status 401."
        );

        globalThis.fetch = originalFetch;
      }
    );

    await t.step(
      "loginWithPassword should throw ApiClientError on other HTTP errors",
      async () => {
        mockJsonResponse(500, { message: "Internal Server Error" });

        await assertRejects(
          () => client.loginWithPassword("test@example.com", "password"),
          ApiClientError,
          "API call to /command/login-with-password failed with status 500."
        );

        globalThis.fetch = originalFetch;
      }
    );

    await t.step("getProfile should return user profile", async () => {
      const authClient = new PenpotClient("http://localhost:8000", "valid-pat");
      const mockProfileTransitArray = [
        "^ ",
        "~:id",
        "~uprofile-uuid",
        "~:email",
        "profile@example.com",
        "~:fullname",
        "Auth User",
      ];
      mockJsonResponse(200, mockProfileTransitArray, {
        "Content-Type": "application/transit+json",
      });

      const profile = await authClient.auth.getProfile(); // Access via auth module
      assertEquals(profile?.["~:id"], "~uprofile-uuid");
      assertEquals(profile?.["~:email"], "profile@example.com");

      globalThis.fetch = originalFetch;
    });

    await t.step(
      "getProfile should throw AuthenticationError on 401",
      async () => {
        const authClient = new PenpotClient(
          "http://localhost:8000",
          "invalid-pat"
        );
        mockJsonResponse(401, { "~:type": "~:authentication" });

        await assertRejects(
          () => authClient.auth.getProfile(),
          AuthenticationError,
          "API call to /command/get-profile failed with status 401."
        );
        globalThis.fetch = originalFetch;
      }
    );
  }
);

Deno.test("PenpotClient - FilesApi (import & export)", async (t) => {
  const client = new PenpotClient("http://localhost:8000", "valid-pat");

  await t.step(
    "importBinfile should handle successful import via SSE",
    async () => {
      const mockFileId = "new-imported-file-uuid-sse";
      const sseResponse = `event: progress\ndata: {"~:section":"~:manifest"}\n\nevent: end\ndata: ["~u${mockFileId}"]\n\n`;
      mockSseResponse(200, sseResponse);

      const result = await client.files.importBinfile(
        "test-sse.penpot",
        "project-uuid-1" as UUID,
        3,
        new Uint8Array([1, 2, 3])
      );
      assertEquals(result, { fileId: mockFileId });

      globalThis.fetch = originalFetch;
    }
  );

  await t.step(
    "importBinfile should throw ApiClientError on non-200 response",
    async () => {
      mockJsonResponse(400, { message: "Bad Request" }); // Not an SSE error

      await assertRejects(
        () =>
          client.files.importBinfile(
            "bad.penpot",
            "proj-id" as UUID,
            1,
            new Uint8Array()
          ),
        ApiClientError,
        "API call to /command/import-binfile failed with status 400."
      );
      globalThis.fetch = originalFetch;
    }
  );

  await t.step(
    "exportBinfile should handle successful binary export",
    async () => {
      const mockBuffer = new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer;
      mockBinaryResponse(200, mockBuffer);

      const result = await client.files.exportBinfile(
        "file-to-export-uuid-1" as UUID,
        3,
        true,
        false
      );
      assertEquals(result, mockBuffer);

      globalThis.fetch = originalFetch;
    }
  );

  await t.step(
    "exportBinfile should throw ApiClientError on non-200 response",
    async () => {
      mockJsonResponse(404, { message: "File Not Found" });

      await assertRejects(
        () =>
          client.files.exportBinfile(
            "non-existent-file-uuid" as UUID,
            1,
            false,
            false
          ),
        ApiClientError,
        "API call to /command/export-binfile failed with status 404."
      );
      globalThis.fetch = originalFetch;
    }
  );

  await t.step("getFile should return file info", async () => {
    // Assuming get-file returns standard JSON object, adjust if it's Transit too.
    const mockFileInfo = {
      id: "~ugetfile-uuid",
      name: "My File",
      revn: 1,
      projectId: "~uproject-id",
    };
    mockJsonResponse(200, mockFileInfo);

    const fileInfo = await client.files.getFile("getfile-uuid" as UUID);
    // Directly access properties as it's mocked as a plain object
    assertEquals(fileInfo.id, "~ugetfile-uuid");
    assertEquals(fileInfo.name, "My File");
    globalThis.fetch = originalFetch;
  });

  await t.step("getFile should throw ApiClientError on 500", async () => {
    mockJsonResponse(500, { error: "Server blew up" });
    await assertRejects(
      () => client.files.getFile("error-file-uuid" as UUID),
      ApiClientError,
      "API call to /command/get-file failed with status 500."
    );
    globalThis.fetch = originalFetch;
  });
});

Deno.test("PenpotClient - ProjectsApi", async (t) => {
  const client = new PenpotClient("http://localhost:8000", "valid-pat");

  await t.step("getProjects should return an array of projects", async () => {
    const mockProjectsArray = [
      { id: "~uproj1", name: "Project 1" },
      { id: "~uproj2", name: "Project 2" },
    ];
    mockJsonResponse(200, mockProjectsArray);

    const projects = await client.projects.getProjects("team-uuid-1" as UUID);
    assertEquals(projects.length, 2);
    assertEquals(projects[0].name, "Project 1");
    globalThis.fetch = originalFetch;
  });

  await t.step(
    "getProjects should return empty array if no projects",
    async () => {
      mockJsonResponse(200, []);
      const projects = await client.projects.getProjects(
        "empty-team-uuid" as UUID
      );
      assertEquals(projects.length, 0);
      globalThis.fetch = originalFetch;
    }
  );

  await t.step("createProject should return the created project", async () => {
    const newProjectId = "new-project-uuid";
    const newProjectName = "My New Project";
    const createdProjectResponse = {
      id: `~u${newProjectId}`,
      name: newProjectName,
    };
    mockJsonResponse(200, createdProjectResponse);

    const createdProject = await client.projects.createProject(
      "team-uuid-2" as UUID,
      newProjectName
    );
    assertEquals(createdProject.id, `~u${newProjectId}`); // Assuming it's returned with ~u
    assertEquals(createdProject.name, newProjectName);
    globalThis.fetch = originalFetch;
  });

  await t.step(
    "createProject should throw ApiClientError on invalid input",
    async () => {
      mockJsonResponse(400, { message: "Invalid Project Name" });
      await assertRejects(
        () => client.projects.createProject("team-uuid-3" as UUID, ""), // Empty name
        ApiClientError,
        "API call to /command/create-project failed with status 400."
      );
      globalThis.fetch = originalFetch;
    }
  );
});

// --- Final cleanup after all tests ---
Deno.test({
  name: "cleanup fetch mock",
  fn() {
    globalThis.fetch = originalFetch;
  },
  sanitizeResources: false, // Allows global mocks
  sanitizeOps: false, // Allows global mocks
});
