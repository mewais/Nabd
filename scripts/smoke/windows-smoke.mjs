// Smoke test of the real Nabd binary on Windows, on the desktop of the
// session it runs in (GitHub's Windows runners have one, with the WebView2
// runtime):
//
//   node scripts/smoke/windows-smoke.mjs        (or: pnpm smoke:windows)
//
// The shared checks (checks.mjs), with the database in %APPDATA%\<identifier>
// and the login entry in HKCU\Software\Microsoft\Windows\CurrentVersion\Run:
// first launch, restart, single instance, closing to the tray, the login
// launch starting hidden; then, through WebDriver (tauri-driver in front of
// an msedgedriver that matches the WebView2 runtime), a set logged and kept
// across a restart, Settings → "Open at startup" and Settings → Quit Nabd,
// and the system's idle time (GetLastInputInfo) in the clock beat. An app the
// test started itself has no window it can ask to quit, so it is ended
// without being asked (nothing is waiting to be saved then); the tray icon,
// toasts and Mica are not looked at.
//
// The known-folder paths cannot be redirected, so the test uses this account's
// own: it refuses to run where Nabd already has data or a login entry (outside
// CI) unless NABD_SMOKE_RESET=1 lets it delete them first. It removes what it
// created when it is done.
//
// Environment:
//   NABD_SMOKE_BINARY             test this binary instead of building one
//   NABD_SMOKE_REQUIRE_WEBDRIVER  1 = the WebDriver parts must run
//   NABD_SMOKE_EDGEDRIVER         the msedgedriver.exe to use, instead of
//                                 finding or downloading one
//   NABD_SMOKE_DRIVER_PORT        tauri-driver's port (default 4444; the native
//                                 driver takes the next one)

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { APP_ID, PRODUCT_NAME, builtBinary, dataDir, loginEntry, sandbox } from "./app.mjs";
import { DriverProcess, runEntry } from "./checks.mjs";

const RUN_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
/** The WebView2 runtime's client id with Edge's updater, under which its version is kept. */
const WEBVIEW2 = "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";

const reg = (...args) => execFileSync("reg", args, { encoding: "utf8", stdio: "pipe" });

function forgetNabd() {
  rmSync(dataDir(), { recursive: true, force: true });
  rmSync(join(process.env.LOCALAPPDATA, APP_ID), { recursive: true, force: true });
  if (loginEntry() !== null) reg("delete", RUN_KEY, "/v", PRODUCT_NAME, "/f");
}

/** The installed WebView2 runtime's version, per machine or per user; null when there is none. */
function webview2Version() {
  for (const hive of ["HKLM\\SOFTWARE\\WOW6432Node", "HKLM\\SOFTWARE", "HKCU\\Software"]) {
    try {
      const pv = /pv\s+REG_SZ\s+([\d.]+)/.exec(
        reg("query", `${hive}\\Microsoft\\EdgeUpdate\\Clients\\${WEBVIEW2}`, "/v", "pv"),
      );
      if (pv && pv[1] !== "0.0.0.0") return pv[1];
    } catch {
      // Not installed in this hive.
    }
  }
  return null;
}

const major = (version) => version?.split(".")[0];

function driverVersion(exe) {
  try {
    return /\d+\.\d+\.\d+\.\d+/.exec(execFileSync(exe, ["--version"], { encoding: "utf8" }))?.[0];
  } catch {
    return undefined;
  }
}

/**
 * An msedgedriver for the WebView2 runtime: the one asked for, else the
 * runner's (EDGEWEBDRIVER, kept at the Edge browser's version) when its major
 * version matches the runtime's, else the matching one downloaded from
 * Microsoft into `dir`.
 */
async function edgeDriver(dir) {
  if (process.env.NABD_SMOKE_EDGEDRIVER) return process.env.NABD_SMOKE_EDGEDRIVER;
  const runtime = webview2Version();
  if (runtime === null) throw new Error("no WebView2 runtime is installed (EdgeUpdate has no pv)");
  const preinstalled =
    process.env.EDGEWEBDRIVER && join(process.env.EDGEWEBDRIVER, "msedgedriver.exe");
  if (preinstalled && major(driverVersion(preinstalled)) === major(runtime)) {
    console.log(
      `msedgedriver ${driverVersion(preinstalled)} for WebView2 ${runtime}: ${preinstalled}`,
    );
    return preinstalled;
  }
  const tried = [];
  for (const host of ["https://msedgedriver.microsoft.com", "https://msedgedriver.azureedge.net"]) {
    const url = `${host}/${runtime}/edgedriver_win64.zip`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const zip = join(dir, "edgedriver.zip");
      writeFileSync(zip, Buffer.from(await response.arrayBuffer()));
      execFileSync("powershell", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${join(dir, "edgedriver")}' -Force`,
      ]);
      const exe = join(dir, "edgedriver", "msedgedriver.exe");
      console.log(
        `msedgedriver ${driverVersion(exe)} for WebView2 ${runtime}: downloaded from ${url}`,
      );
      return exe;
    } catch (error) {
      tried.push(`${url}: ${error.message}`);
    }
  }
  throw new Error(
    `no msedgedriver for WebView2 ${runtime}: the runner's is ` +
      `${driverVersion(preinstalled) ?? "missing"}, and downloading failed:\n  ${tried.join("\n  ")}`,
  );
}

function hasTauriDriver() {
  try {
    execFileSync("tauri-driver", ["--help"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** tauri-driver in front of msedgedriver, when both can be had (or must be). */
async function startWebDriver(dir, port) {
  const required = process.env.NABD_SMOKE_REQUIRE_WEBDRIVER === "1";
  if (!hasTauriDriver()) {
    if (required)
      throw new Error("tauri-driver is not installed (cargo install tauri-driver --locked)");
    return null;
  }
  let native;
  try {
    native = await edgeDriver(dir);
  } catch (error) {
    if (required) throw error;
    console.log(`no WebDriver: ${error.message}`);
    return null;
  }
  return DriverProcess.start(port, native);
}

if (process.platform !== "win32") {
  console.error(
    "windows-smoke: this is the Windows smoke test (Linux: smoke:linux, macOS: smoke:macos)",
  );
  process.exit(2);
}

const leftover = existsSync(dataDir()) || loginEntry() !== null;
if (leftover && !process.env.CI && process.env.NABD_SMOKE_RESET !== "1") {
  console.error(
    `windows-smoke: Nabd already has data (${dataDir()}) or a login entry (${RUN_KEY}) on this ` +
      "account, which the test would delete. Run it on a spare account, or set NABD_SMOKE_RESET=1.",
  );
  process.exit(2);
}

const dir = sandbox();
// A private copy: a rebuild while the test runs cannot swap the binary under it.
const binary = join(dir, "nabd.exe");
copyFileSync(builtBinary("nabd.exe"), binary);
forgetNabd(); // a fresh account

const port = Number(process.env.NABD_SMOKE_DRIVER_PORT ?? 4444);
let driver = null;
await runEntry({
  async setup() {
    driver = await startWebDriver(dir, port);
    return {
      binary,
      tray: true,
      driverUrl: driver?.url,
      requireWebDriver: process.env.NABD_SMOKE_REQUIRE_WEBDRIVER === "1",
      // Nothing waits to be saved, and an app the test started has no window
      // that could be asked to quit.
      end: (app) => app.kill(),
      diagnostics: [{ title: "tauri-driver and msedgedriver", describe: () => driver?.describe() }],
    };
  },
  checks: [
    "first-launch",
    "restart",
    "second-instance",
    "close-to-tray",
    "login-launch",
    "logged-set",
    "autostart-setting",
    "quit-from-settings",
    "system-idle",
  ],
  async cleanup() {
    await driver?.stop();
    forgetNabd();
    rmSync(dir, { recursive: true, force: true });
  },
});
