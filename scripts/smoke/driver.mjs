// tauri-driver, the WebDriver server the acts of app-session.mjs talk to, as a
// process an entry script (windows-smoke.mjs) starts once and stops when it is
// done. linux-smoke.sh starts its own, as a job of its throw-away session
// (start_webdriver in lib.sh), since its checks run in several Node processes.

import { AppProcess, eventually, launched } from "./app.mjs";
import { driverStatus } from "./webdriver.mjs";

/**
 * tauri-driver on `port`, in front of the platform's `native` driver on the
 * next port, with its output kept for the diagnostics of a failure.
 */
export class DriverProcess {
  static async start(port, native) {
    const driver = new DriverProcess(port, native);
    await eventually(
      `tauri-driver and the native driver behind it ready on port ${port}`,
      async () => {
        if (!driver.process.running) throw new Error(driver.process.describe());
        return (await driverStatus(driver.url)).ready;
      },
      { found: () => driver.describe() },
    );
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
    // Not one of the app's launches: it outlives every check.
    launched.splice(launched.indexOf(this.process), 1);
  }

  describe() {
    return this.process.describe();
  }

  stop() {
    return this.process.kill();
  }
}
