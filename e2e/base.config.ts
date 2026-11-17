// What the end-to-end specs and the screenshot capture share: the browser they
// drive, and the built app they drive it on (served with `vite preview`).

import { devices } from "@playwright/test";
import type { PlaywrightTestConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { TIME_ZONE } from "./support/time";

/** The browser: desktop Chrome at the app's usual size, in a non-UTC time zone. */
export function browserAt(baseURL: string): PlaywrightTestConfig["use"] {
  return {
    ...devices["Desktop Chrome"],
    baseURL,
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    timezoneId: TIME_ZONE,
  };
}

/** Build the app and serve it on `port`; an already running server is used when `reuse` says so. */
export function servedApp(port: number, reuse: boolean): PlaywrightTestConfig["webServer"] {
  return {
    command: `pnpm build && pnpm --filter @nabd/app exec vite preview --port ${port} --strictPort`,
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: `http://localhost:${port}`,
    reuseExistingServer: reuse,
    timeout: 180_000,
  };
}
