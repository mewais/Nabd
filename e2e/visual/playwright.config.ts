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

import { defineConfig } from "@playwright/test";
import { browserAt, servedApp } from "../base.config";

const PORT = 4398;
/** An app someone already serves; otherwise this config builds and serves one. */
const URL_GIVEN = process.env.URL;

export default defineConfig({
  testDir: ".",
  outputDir: "./test-results",
  // One page at a time: screenshots of pages running side by side now and then fail to capture.
  workers: 1,
  reporter: "line",
  retries: 1,
  use: browserAt(URL_GIVEN ?? `http://localhost:${PORT}`),
  webServer: URL_GIVEN ? undefined : servedApp(PORT, true),
});
