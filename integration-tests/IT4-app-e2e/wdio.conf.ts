import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

// tauri-driver bridges WebdriverIO to the native WebView. Requires a display.
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const APP_BINARY = r("../../src-tauri/target/debug/nabd");
let tauriDriver: ChildProcess;

export const config: WebdriverIO.Config = {
  runner: "local",
  specs: ["./specs/**/*.e2e.ts"],
  maxInstances: 1,
  capabilities: [
    {
      // @ts-expect-error tauri-specific capability
      "tauri:options": { application: APP_BINARY },
      browserName: "wry",
    },
  ],
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: { ui: "bdd", timeout: 60000 },
  hostname: "127.0.0.1",
  port: 4444,
  // Build the app before the session, then start tauri-driver.
  onPrepare: () => {
    spawnSync("pnpm", ["--filter", "@nabd/app", "build"], { stdio: "inherit" });
    spawnSync("cargo", ["build", "--manifest-path", r("../../src-tauri/Cargo.toml")], {
      stdio: "inherit",
    });
  },
  beforeSession: () => {
    tauriDriver = spawn("tauri-driver", [], { stdio: [null, process.stdout, process.stderr] });
  },
  afterSession: () => {
    tauriDriver?.kill();
  },
};
