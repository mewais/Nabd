// Smoke test of the real Nabd app on macOS, in the session it runs in
// (GitHub's macOS runners have a window server):
//
//   node scripts/smoke/macos-smoke.mjs        (or: pnpm smoke:macos)
//
// What it checks is in the README (Smoke test). It runs a copy of the .app
// with HOME in a temporary folder, so the account's own data and login entry
// are left alone.
//
// Environment:
//   NABD_SMOKE_BINARY   test this Nabd.app instead of building one

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { builtBinary, sandbox } from "./app.mjs";
import { skipped } from "./checks.mjs";
import { runEntry } from "./runner.mjs";
import { AccessibilityUnavailable, systemEvents } from "./screen.mjs";

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const run = (command, ...args) => execFileSync(command, args, { encoding: "utf8" }).trim();

if (process.platform !== "darwin") {
  console.error(
    "macos-smoke: this is the macOS smoke test (Linux: smoke:linux, Windows: smoke:windows)",
  );
  process.exit(2);
}

/** The app's process id, by its executable's name. */
const pidOf = (executable) => run("sh", "-c", `pgrep -x '${executable}' | head -n 1`);

/**
 * Open the menu-bar item's menu, read its entries ([label, enabled]) and
 * choose Quit, through System Events. Clicking a menu-bar item blocks System
 * Events until the menu closes, so it is clicked without waiting and System
 * Events restarted (the usual way round it) before the menu is read.
 */
function quitFromTray(executable) {
  const item = `menu bar item 1 of menu bar 2 of (first process whose unix id is ${pidOf(executable)})`;
  systemEvents(`ignoring application responses\nclick ${item}\nend ignoring`);
  run("sh", "-c", "sleep 0.5; killall 'System Events' || true; sleep 1");
  const listing = systemEvents(
    [
      "set entries to {}",
      `repeat with entry in menu items of menu 1 of ${item}`,
      "set end of entries to (name of entry as text) & tab & (enabled of entry as text)",
      "end repeat",
      `click menu item "Quit" of menu 1 of ${item}`,
      "set AppleScript's text item delimiters to linefeed",
      "return entries as text",
    ].join("\n"),
  );
  return listing
    .split("\n")
    .map((line) => line.split("\t"))
    .filter(([label]) => label !== "missing value") // separators
    .map(([label, enabled]) => [label, enabled === "true"]);
}

let accessibility = true;

/** End the app from its menu; without UI scripting, as the Dock's Quit would (no save first). */
async function end(app, executable, helper) {
  if (accessibility) {
    try {
      quitFromTray(executable);
      return await app.expectExit("the menu-bar item's Quit");
    } catch (error) {
      if (!(error instanceof AccessibilityUnavailable)) throw error;
      accessibility = false;
      skipped(
        "quitting from the menu-bar item",
        `UI scripting is not allowed here: ${error.message}`,
      );
    }
  }
  execFileSync(helper, ["terminate", String(app.pid)]);
  await Promise.race([app.exited, sleep(10_000)]);
  await app.kill();
}

const dir = sandbox();
process.env.HOME = join(dir, "home");
mkdirSync(process.env.HOME);
// A private copy: a rebuild while the test runs cannot swap the app under it.
const bundle = join(dir, "Nabd.app");
run("cp", "-R", builtBinary("bundle/macos/Nabd.app", ["--bundles", "app"]), bundle);
const executable = JSON.parse(
  run("plutil", "-convert", "json", "-o", "-", join(bundle, "Contents", "Info.plist")),
).CFBundleExecutable;
const helper = join(dir, "macos-windows");

await runEntry({
  setup() {
    run("swiftc", "-O", "-o", helper, here("macos-windows.swift"));
    process.env.NABD_SMOKE_MACOS_HELPER = helper;
    return {
      binary: join(bundle, "Contents", "MacOS", executable),
      tray: true,
      end: (app) => end(app, executable, helper),
      quitFromTray: () => quitFromTray(executable),
    };
  },
  checks: [
    "first-launch",
    "restart",
    "second-instance",
    "close-to-tray",
    "login-launch",
    "tray-menu",
  ],
  cleanup() {
    rmSync(dir, { recursive: true, force: true });
  },
});
