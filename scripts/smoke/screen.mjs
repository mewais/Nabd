// The app's window as the desktop sees it, and the user's input, on each
// platform — for the checks (checks.mjs) and the WebDriver acts
// (app-session.mjs):
//
//   Linux    the X server, through x11.sh (xdotool): Nabd windows by class
//   Windows  Win32, through windows.ps1 (PowerShell): the visible, unowned
//            top-level windows of the app's processes that are not tool
//            windows; closing posts WM_CLOSE to them
//   macOS    the window server's list (CGWindowList, macos-windows.swift: no
//            permission needed to see whether a window is on screen); closing
//            clicks the window's close button through System Events, which
//            needs the accessibility permission
//
// Each screen has the same face: shown(), count(), close(), describe(), and,
// where the platform has them, focused() and input().

import { execFileSync, spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { SmokeFailure, eventually } from "./app.mjs";

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const run = (command, args) => execFileSync(command, args, { encoding: "utf8" }).trim();

/** The screen of the platform this runs on, watching the app started from `binary`. */
export function screenFor(binary) {
  const name = binary.split(/[\\/]/).pop();
  const screen = { win32: windowsScreen, darwin: macosScreen }[process.platform] ?? x11Screen;
  return withExpectations(screen(name));
}

function withExpectations(screen) {
  return {
    ...screen,

    expectShown: (shown, timeoutMs = 15_000) =>
      eventually(`the Nabd window ${shown ? "shown" : "hidden"}`, () => screen.shown() === shown, {
        timeoutMs,
        found: screen.describe,
      }),

    /** The window stays hidden for `ms`. */
    async expectStaysHidden(what, ms = 2000) {
      for (let waited = 0; waited <= ms; waited += 250) {
        if (screen.shown()) throw new SmokeFailure(`${what}: the window hidden`, screen.describe());
        await sleep(250);
      }
    },

    /** The window hidden in the tray is back on screen, and the keyboard is still elsewhere. */
    async expectShownUnfocused() {
      await this.expectShown(true);
      await sleep(1000);
      if (screen.focused()) throw new SmokeFailure("the window back without the keyboard focus");
    },

    /** Keep giving input from now until the returned function is called. */
    async busy() {
      if (screen.input === undefined) throw new Error("no synthetic input on this platform");
      const stop = screen.input();
      // Past the beat that was already on its way when the first input came.
      await sleep(1200);
      return stop;
    },
  };
}

// ------------------------------------------------------------------ Linux ---

function x11Screen() {
  const x11 = (command) => {
    try {
      return run(here("x11.sh"), [command]);
    } catch {
      return null;
    }
  };
  /** One synthetic input: a mouse movement under X11, a key under Wayland (wtype). */
  const touch = () =>
    process.env.WAYLAND_DISPLAY ? execFileSync("wtype", ["-k", "Shift_L"]) : x11("touch");
  return {
    shown: () => x11("shown") !== null,
    count: () => Number(x11("count")),
    focused: () => x11("focused") !== null,
    close: () => run(here("x11.sh"), ["close"]),
    describe: () => `${x11("count")} Nabd window(s) shown on the X server`,
    input() {
      touch();
      const timer = setInterval(touch, 500);
      return () => clearInterval(timer);
    },
  };
}

// ---------------------------------------------------------------- Windows ---

function windowsScreen(binaryName) {
  const name = binaryName.replace(/\.exe$/i, "");
  const windows = (command) =>
    run("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      here("windows.ps1"),
      name,
      command,
    ]);
  const count = () => Number(windows("count"));
  return {
    shown: () => count() > 0,
    count,
    focused: () => null,
    close: () => windows("close"),
    describe: () => windows("describe"),
    /**
     * Keys (F15, which nothing acts on) sent through SendInput by one
     * PowerShell process, every 300 ms. The returned function stops it and
     * fails if it ended early: the session took no input.
     */
    input() {
      const keys = spawn("powershell", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Add-Type -AssemblyName System.Windows.Forms; " +
          "while ($true) { [System.Windows.Forms.SendKeys]::SendWait('{F15}'); Start-Sleep -Milliseconds 300 }",
      ]);
      let error = "";
      keys.stderr.on("data", (chunk) => (error += chunk));
      return () => {
        if (keys.exitCode !== null) {
          throw new SyntheticInputUnavailable(
            `SendKeys ended with ${keys.exitCode}: ${error.trim()}`,
          );
        }
        keys.kill();
      };
    },
  };
}

/** The desktop would not take synthetic input: an environment's limit, not the app's. */
export class SyntheticInputUnavailable extends Error {}

// ------------------------------------------------------------------ macOS ---

/**
 * The window list comes from macos-windows.swift, compiled by macos-smoke.mjs
 * to NABD_SMOKE_MACOS_HELPER: one JSON line per window of the given processes.
 */
function macosScreen(executable) {
  const windows = () => {
    const pids = run("sh", ["-c", `pgrep -x '${executable}' || true`])
      .split("\n")
      .filter(Boolean);
    if (pids.length === 0) return [];
    return run(process.env.NABD_SMOKE_MACOS_HELPER, ["windows", ...pids])
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  };
  // Layer 0 holds ordinary windows, and also the app's strips of menu bar
  // (offscreen, 30 points high): the main window is never under 640 high.
  const shownWindows = () =>
    windows().filter((w) => w.layer === 0 && w.onscreen && w.height >= MIN_WINDOW_HEIGHT);
  const pid = () => run("sh", ["-c", `pgrep -x '${executable}' | head -n 1`]);
  return {
    shown: () => shownWindows().length > 0,
    count: () => shownWindows().length,
    focused: () => null,
    close: () =>
      systemEvents(
        `tell (first process whose unix id is ${pid()}) to ` +
          `click (first button of window 1 whose subrole is "AXCloseButton")`,
      ),
    describe: () =>
      windows()
        .map((w) => JSON.stringify(w))
        .join("\n") || `no window of a process named ${executable}`,
  };
}

/** Below the main window's smallest height (640), above any strip of menu bar. */
const MIN_WINDOW_HEIGHT = 200;

/**
 * Run AppleScript lines inside `tell application "System Events"`, with a
 * time limit (a permission prompt nobody answers would otherwise hang). Throws
 * AccessibilityUnavailable when macOS refuses UI scripting.
 */
export function systemEvents(script, timeoutMs = 30_000) {
  try {
    return execFileSync(
      "osascript",
      ["-e", `tell application "System Events"\n${script}\nend tell`],
      {
        encoding: "utf8",
        timeout: timeoutMs,
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).trim();
  } catch (error) {
    const said = `${error.stderr ?? ""}${error.message}`.trim();
    if (/assistive access|-25211|-1743|not authori[sz]ed|ETIMEDOUT/i.test(said)) {
      throw new AccessibilityUnavailable(said);
    }
    throw error;
  }
}

/** macOS would not let this process script the UI: an environment's limit, not the app's. */
export class AccessibilityUnavailable extends Error {}
