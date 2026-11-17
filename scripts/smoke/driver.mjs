// tauri-driver, the WebDriver server the acts of app-session.mjs talk to, as a
// process started once and stopped when the run is done: by an entry script
// (windows-smoke.mjs), or as a job of the throw-away session linux-smoke.sh
// sets up (its checks run in several Node processes), through the command line
// at the bottom:
//
//   node driver.mjs PORT NATIVE-DRIVER
//
// which runs until it is ended (SIGTERM), and then prints the drivers' last
// lines, for the session's log.

import process from "node:process";
import { AppProcess, eventually, isMain } from "./app.mjs";
import { driverStatus } from "./webdriver.mjs";

/**
 * tauri-driver on `port`, in front of the platform's `native` driver on the
 * next port, with its output kept for the diagnostics of a failure.
 */
export class DriverProcess {
  /** Start the drivers and wait until they are ready for a session; stop them if they never are. */
  static async start(port, native) {
    const driver = new DriverProcess(port, native);
    try {
      await eventually(
        `tauri-driver and the native driver behind it ready on port ${port}`,
        async () => {
          if (!driver.process.running) throw new Error(driver.process.describe());
          return (await driverStatus(driver.url)).ready;
        },
        { found: () => driver.describe() },
      );
    } catch (error) {
      await driver.stop();
      throw error;
    }
    return driver;
  }

  constructor(port, native) {
    this.url = `http://127.0.0.1:${port}`;
    this.process = new AppProcess("tauri-driver", [
      "--port",
      String(port),
      "--native-port",
      String(port + 1),
      "--native-driver",
      native,
    ]);
  }

  describe() {
    return this.process.describe();
  }

  /**
   * End tauri-driver and the native driver it started: asked to end (SIGTERM),
   * tauri-driver ends the native one first; on Windows the whole process tree
   * is ended.
   */
  async stop() {
    if (process.platform === "win32" || !this.process.running) return this.process.kill();
    this.process.child.kill("SIGTERM");
    await this.process.exited;
  }
}

if (isMain(import.meta.url)) {
  const [port, native] = process.argv.slice(2);
  if (!/^\d+$/.test(port ?? "") || native === undefined) {
    console.error("usage: driver.mjs PORT NATIVE-DRIVER");
    process.exit(2);
  }
  const driver = await DriverProcess.start(Number(port), native);
  process.on("SIGTERM", async () => {
    console.error(`--- tauri-driver and the native driver\n${driver.describe()}`);
    await driver.stop();
    process.exit(0);
  });
}
