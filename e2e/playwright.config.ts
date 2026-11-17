// End-to-end tests of the whole UI, in a browser, on the in-memory demo backend.
//
//   pnpm e2e                      build, serve with `vite preview`, run every spec headless
//   pnpm e2e specs/03-*           one spec; any `playwright test` argument can follow
//
// The Tauri shell is not involved here: scripts/smoke/linux-smoke.sh covers the real binary.

import { defineConfig } from "@playwright/test";
import { browserAt, servedApp } from "./base.config";

const PORT = 4399;
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./specs",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: CI,
  reporter: CI ? [["github"], ["list"]] : "list",
  use: browserAt(`http://localhost:${PORT}`),
  webServer: servedApp(PORT, !CI),
});
