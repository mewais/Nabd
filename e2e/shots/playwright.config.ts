// TEMPORARY: before/after screenshots for the styling pass. Not part of the repo.
import { defineConfig, devices } from "@playwright/test";
import { TIME_ZONE } from "../support/time";

export default defineConfig({
  testDir: ".",
  outputDir: "/tmp/style-shots/.results",
  fullyParallel: true,
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:4461",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    timezoneId: TIME_ZONE,
  },
});
