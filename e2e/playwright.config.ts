// End-to-end tests of the whole UI, in a browser, on the in-memory demo backend.
//
//   pnpm e2e                      build, serve with `vite preview`, run every spec headless
//   pnpm e2e specs/03-*           one spec; any `playwright test` argument can follow
//
// The Tauri shell is not involved here: scripts/smoke/linux-smoke.sh covers the real binary.

import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { TIME_ZONE } from "./support/time";

const PORT = 4399;
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./specs",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: CI,
  reporter: CI ? [["github"], ["list"]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    timezoneId: TIME_ZONE,
  },
  webServer: {
    command: `pnpm build && pnpm --filter @nabd/app exec vite preview --port ${PORT} --strictPort`,
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
});
