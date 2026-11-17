// Runs the checks of checks.mjs in order and, when one fails, reports what is
// needed to understand it: the screen, the data folder, the stored day, the
// login entry and the last lines of every launch's output. runEntry is the
// body of each platform's entry script.

import { existsSync, readdirSync } from "node:fs";
import process from "node:process";
import { AppProcess, SmokeFailure, dataDir, loginEntry, loginEntryLocation } from "./app.mjs";
import { CHECKS, ok, report, storedDay } from "./checks.mjs";
import { screenFor } from "./screen.mjs";

/** Every launch of the app this run, for the diagnostics of a failure. */
const launched = [];

/** Start `binary` with `args`, as one of the run's launches. */
function launch(binary, args) {
  const app = new AppProcess(binary, args);
  launched.push(app);
  return app;
}

/** Write what an expectation needs to be understood: the screen, the files, the app's output. */
function reportFailure(ctx, name, error, since) {
  const section = (title, body) => {
    let text;
    try {
      text = body();
    } catch (failure) {
      text = `(could not tell: ${failure.message})`;
    }
    console.error(`--- ${title}\n${text}`);
  };
  // linux-smoke.sh shows the results file as it goes, and the rest on failure.
  if (process.env.NABD_SMOKE_RESULTS) report(`FAIL ${name}: ${error.message}`);
  console.error(`FAIL ${name}: ${error instanceof SmokeFailure ? error.message : error.stack}`);
  section("the screen", ctx.screen.describe);
  section(`the data folder (${dataDir()})`, () =>
    existsSync(dataDir()) ? readdirSync(dataDir()).join("  ") : "missing",
  );
  section("the stored day", storedDay);
  section(`the login entry (${loginEntryLocation()})`, () => JSON.stringify(loginEntry()));
  for (const app of launched.slice(since))
    section("an app launch and its last lines", () => app.describe());
  for (const extra of ctx.diagnostics ?? []) section(extra.title, extra.describe);
}

/**
 * Run the checks `names` in order, on `ctx`: { binary, tray, end(app),
 * driverUrl?, requireWebDriver?, trayMenu?, quitFromTray?, diagnostics? }.
 * Stops at the first failure; returns whether all passed. An app a check
 * leaves running is ended before the next one starts.
 */
export async function runChecks(ctx, names) {
  const context = {
    screen: screenFor(ctx.binary),
    launch: (args = [], binary = ctx.binary) => launch(binary, args),
    ...ctx,
  };
  for (const name of names) {
    const since = launched.length;
    try {
      if (!(name in CHECKS)) throw new Error(`no check named ${name}`);
      await CHECKS[name](context);
    } catch (error) {
      reportFailure(context, name, error, since);
      return false;
    } finally {
      for (const app of launched.slice(since)) await app.kill();
    }
  }
  return true;
}

/**
 * The body of a platform's entry script: `setup()` returns the context for
 * runChecks, the checks run, `cleanup()` runs whatever happened, and the
 * process exits 0 only when every check passed.
 */
export async function runEntry({ setup, checks, cleanup }) {
  let passed = false;
  try {
    passed = await runChecks(await setup(), checks);
  } catch (error) {
    report(`FAIL setting up: ${error.message}`);
    console.error(error.stack);
  } finally {
    try {
      await cleanup();
    } catch (error) {
      console.error(`(could not clean up: ${error.message})`);
    }
  }
  if (passed) ok("all expectations met");
  process.exit(passed ? 0 : 1);
}
