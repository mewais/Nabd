// Screenshots of every screen, modal and overlay state, in the dark and the
// light theme, for a visual check by eye. Not a test suite: `pnpm e2e` never
// runs it (its config only reads e2e/specs/).
//
//   pnpm visual                   build, serve with `vite preview`, save e2e/visual/shots/<theme>-<state>.png
//   OUT=/tmp/before pnpm visual   somewhere else (to compare two builds side by side)
//   URL=http://localhost:4471 pnpm visual   an app that is already being served
//
// It drives the app with the e2e fixture and builders, on the same fake clock,
// so two runs of the same build give the same pictures.

import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { TIME_ZONE } from "../support/time";

const PORT = 4398;
/** An app someone already serves; otherwise this config builds and serves one. */
const URL_GIVEN = process.env.URL;

export default defineConfig({
  testDir: ".",
  outputDir: "./test-results",
  fullyParallel: true,
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: URL_GIVEN ?? `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    timezoneId: TIME_ZONE,
  },
  webServer: URL_GIVEN
    ? undefined
    : {
        command: `pnpm build && pnpm --filter @nabd/app exec vite preview --port ${PORT} --strictPort`,
        cwd: fileURLToPath(new URL("../..", import.meta.url)),
        url: `http://localhost:${PORT}`,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
