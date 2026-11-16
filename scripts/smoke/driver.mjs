// tauri-driver, the WebDriver server the acts of app-session.mjs talk to, as a
// process the entry scripts start once and stop when they are done.

import { AppProcess, eventually, launched } from "./app.mjs";

/**
 * tauri-driver on `port`, in front of the platform's `native` driver on the
 * next port, with its output kept for the diagnostics of a failure.
 */
export class DriverProcess {
  static async start(port, native) {
    const driver = new DriverProcess(port, native);
    await eventually(
      `tauri-driver answering on port ${port}`,
      async () => {
        if (!driver.process.running) throw new Error(driver.process.describe());
        return (await fetch(`${driver.url}/status`).catch(() => null))?.ok;
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
