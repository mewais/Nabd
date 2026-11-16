// Drives the real Nabd window through WebDriver (tauri-driver in front of
// WebKitWebDriver), for scripts/smoke/linux-smoke.sh, which checks the database
// between the acts.
//
//   node scripts/smoke/app-session.mjs <act> <driver-url> <nabd-binary>
//
// Each act starts the app, does its part and closes the app again.

import process from "node:process";
import { Session } from "./webdriver.mjs";

const ACTS = {
  /** Pause nudges, then log the one set of the plan the smoke test stored. */
  async "log-a-set"(app) {
    await app.press("Pause");
    await app.waitForButton("Resume");
    await app.press("Start set");
    await app.press("Log this set");
    await app.waitForText("1 set logged today");
  },

  /** After a restart on the same day: the set is still counted and nudges are still paused. */
  async "after-restart"(app) {
    await app.waitForText("1/1 set");
    await app.waitForText("Day complete");
    await app.waitForButton("Resume");
  },
};

const [name, driverUrl, binary] = process.argv.slice(2);
const act = ACTS[name];
if (act === undefined || driverUrl === undefined || binary === undefined) {
  console.error(`usage: app-session.mjs <${Object.keys(ACTS).join("|")}> <driver-url> <binary>`);
  process.exit(2);
}

const app = await Session.start(driverUrl, binary);
try {
  await act(app);
} finally {
  await app.end();
}
