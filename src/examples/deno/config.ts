/**
 * Configuration for the import/export example workflow.
 *
 * IMPORTANT: Create a copy of this file named `config.ts` and fill in your
 * actual credentials and IDs. This file (`config.ts`) is in .gitignore
 * to prevent committing sensitive data.
 */

/**
 * Your personal access token from Penpot.
 * You can generate one in your user settings.
 * @see https://help.penpot.app/user-guide/personal-access-tokens/
 */
export const PENPOT_ACCESS_TOKEN = Deno.env.get("PENPOT_ACCESS_TOKEN") ||
  "eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2R0NNIn0.HTn2HI4NljgNivX3kyexKV6bGMNZtg8PcE7AVYg-hXAKqp9o9YE4xw.jJ-18UXU8H8RYj91.4m57lxFFbmKLnfL-29FkNtGL2fIpmo5B1itPjtyJJoi76I14KkZFiBGh-SejE8Tw4t_eCQB1645sRUc4G5GOzK8nZQvGWI6p9adrKbQxRJP-zRhof3A6tddKJuv2dtxR4yDG3NkzFOzHVA.v35dHqJ8iHNHK_7xYj3G_A";
/**
 * The base URL of your Penpot instance.
 * For the cloud version, this is "https://design.penpot.app".
 */
export const PENPOT_BASE_URL = Deno.env.get("PENPOT_BASE_URL") ||
  "https://design.penpot.app";

/**
 * The ID of the project where the `demo.penpot` file will be imported.
 */
export const TARGET_PROJECT_ID = Deno.env.get("TARGET_PROJECT_ID") ||
  "5ddfd2fc-95bd-818a-8006-7af41e62d249";

/**
 * The relative path to the binary `.penpot` file you want to import.
 */
export const DEMO_PENPOT_FILE_PATH = "./src/examples/demo.penpot";
