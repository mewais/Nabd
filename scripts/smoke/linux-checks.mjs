// The shared checks (checks.mjs) as linux-smoke.sh runs them, inside its
// throw-away session; --tray once the fake tray host (desktop_bus.py) is up:
//
//   node linux-checks.mjs --binary PATH [--driver URL] [--tray] CHECK...

import process from "node:process";
import { parseArgs } from "node:util";
import { expectCleanExit } from "./checks.mjs";
import { tray } from "./linux-desktop.mjs";
import { runChecks } from "./runner.mjs";
import { screenFor } from "./screen.mjs";

/** The tray menu as the fake host reads it, then its Quit chosen. */
function quitFromLinuxTray() {
  const entries = tray
    .menu()
    .map((label) =>
      label.endsWith(DISABLED) ? [label.slice(0, -DISABLED.length), false] : [label, true],
    );
  tray.click("Quit");
  return entries;
}

const DISABLED = " (disabled)";

const { values, positionals } = parseArgs({
  options: {
    binary: { type: "string" },
    driver: { type: "string" },
    tray: { type: "boolean", default: false },
  },
  allowPositionals: true,
});
const passed = await runChecks(
  {
    binary: values.binary,
    driverUrl: values.driver,
    requireWebDriver: process.env.NABD_SMOKE_REQUIRE_WEBDRIVER === "1",
    tray: values.tray,
    quitFromTray: quitFromLinuxTray,
    // With a tray, its Quit; without, closing the window is quitting.
    async end(app) {
      if (values.tray) tray.click("Quit");
      else screenFor(values.binary).close();
      await expectCleanExit(app, values.tray ? "the tray's Quit" : "closing the window (no tray)");
    },
  },
  positionals,
);
process.exit(passed ? 0 : 1);
