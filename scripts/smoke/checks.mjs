// What the smoke test expects of the real app on every desktop: each check
// launches the binary under test, looks at its window, its database and its
// login entry, and ends it again. docs/smoke-test.md lists the checks and
// which platform runs which; runner.mjs runs them.

import { appendFileSync } from "node:fs";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import {
  ALL_DAY,
  AUTOSTART_ARG,
  EVERY_DAY,
  SCHEMA_VERSION,
  SmokeFailure,
  TRAY_MENU,
  database,
  databasePath,
  dayState,
  eventually,
  existingLoginEntry,
  expectEqual,
  expectLoginEntry,
  instances,
  localDate,
  loginEntry,
  loginEntryLocation,
  plan,
} from "./app.mjs";
import { runAct } from "./app-session.mjs";
import { AccessibilityUnavailable, SyntheticInputUnavailable } from "./screen.mjs";

// -------------------------------------------------------------- reporting ---

/** A result line: to NABD_SMOKE_RESULTS when set (linux-smoke.sh follows it), else stdout. */
export function report(line) {
  if (process.env.NABD_SMOKE_RESULTS) appendFileSync(process.env.NABD_SMOKE_RESULTS, `${line}\n`);
  else console.log(line);
}

export const ok = (what) => report(`ok   ${what}`);
export const skipped = (what, why) => report(`ok   (skipped: ${what} — ${why})`);

/** Whether the WebDriver parts can run; says so when they cannot. */
function needsWebDriver(ctx, what) {
  if (ctx.driverUrl) return true;
  if (ctx.requireWebDriver) throw new SmokeFailure(`a WebDriver for ${what}`, "none was set up");
  skipped(what, "no WebDriver (tauri-driver and the platform's driver)");
  return false;
}

// ----------------------------------------------------------------- checks ---

const TODAY = localDate();
const YESTERDAY = localDate(-1);
const LOGGED_SET = `push_up__bodyweight ${TODAY} ${TODAY} manual row`;

const dayIsToday = () => database.stored("dayState", ".date") === TODAY;
export const storedDay = () => `dayState ${database.value("dayState")}`;

/** Fail unless the app ended by itself, successfully, leaving the database sound. */
export async function expectCleanExit(app, what) {
  await app.expectExit(what);
  if (!database.isClean()) {
    throw new SmokeFailure(`a sound database after ${what}, with no rollback journal left`);
  }
}

export const CHECKS = {
  /**
   * A fresh account: a window; the database at today's schema version, which
   * the frontend has written its day state to; the login entry ("Open at
   * startup" is on by default), with --autostart. Without a tray, closing the
   * window quits, by way of the window, which saves first.
   */
  async "first-launch"(ctx) {
    const app = ctx.launch();
    await ctx.screen.expectShown(true, 60_000);
    ok("a window appears");
    await eventually(`a database at ${databasePath()}`, database.exists, { timeoutMs: 30_000 });
    await eventually(
      `the database at schema version ${SCHEMA_VERSION}`,
      () => database.schemaVersion() === SCHEMA_VERSION,
      { found: () => `version ${database.schemaVersion()}` },
    );
    ok(`the database is created at ${databasePath()}, schema version ${SCHEMA_VERSION}`);
    await eventually("the frontend storing today's day state", dayIsToday, {
      timeoutMs: 30_000,
      found: storedDay,
    });
    ok("the frontend booted and stored its day state");
    await eventually(
      `the login entry at ${loginEntryLocation()}`,
      () => {
        expectLoginEntry(ctx.binary);
        return true;
      },
      { timeoutMs: 10_000 },
    );
    ok(`"Open at startup" (on by default) writes the login entry, with ${AUTOSTART_ARG}`);
    if (ctx.tray) return ctx.end(app);
    ctx.screen.close();
    await expectCleanExit(app, "closing the window (no tray)");
    ok("without a tray, closing the window quits the app, by way of the window's save");
  },

  /**
   * A plan stored before the launch is still there, and the day that ended
   * while the app was off — skipped outright, with nudges paused — is rolled
   * over and put on record (a floating plan moves on from such a day).
   */
  async restart(ctx) {
    const program = plan(1);
    database.put({
      program,
      settings: JSON.stringify(EVERY_DAY),
      dayState: dayState({ date: YESTERDAY, carried: {}, skipped: ["row"], paused: true }),
    });
    const app = ctx.launch();
    await ctx.screen.expectShown(true, 60_000);
    await eventually("yesterday rolled over at launch", dayIsToday, {
      timeoutMs: 30_000,
      found: storedDay,
    });
    expectEqual("the stored plan after a restart", database.value("program"), program);
    expectEqual("the schema version after a restart", database.schemaVersion(), SCHEMA_VERSION);
    expectEqual(
      "yesterday's record (date, planned, done)",
      ["[0].date", "[0].planned", "[0].done"].map((path) => database.stored("dayLog", path)),
      [YESTERDAY, 1, 0],
    );
    expectEqual("pause on the new day", database.stored("dayState", ".paused"), 0);
    ok("a restart keeps the stored plan and rolls yesterday over in the database");
    await ctx.end(app);
  },

  /** A second launch hands over to the running app and exits; one app, one window. */
  async "second-instance"(ctx) {
    const app = ctx.launch();
    await ctx.screen.expectShown(true, 60_000);
    await ctx.launch().expectExit("a second launch");
    if (!app.running) throw new SmokeFailure("the first instance still running", app.describe());
    expectEqual("the number of Nabd processes", instances(ctx.binary), 1);
    expectEqual("the number of Nabd windows shown", ctx.screen.count(), 1);
    ok("a second launch exits and leaves the first instance and its one window");
    await ctx.end(app);
  },

  /** With a tray, closing the window hides it; a second launch brings it back. */
  async "close-to-tray"(ctx) {
    const app = ctx.launch();
    await ctx.screen.expectShown(true, 60_000);
    try {
      ctx.screen.close();
    } catch (error) {
      if (!(error instanceof AccessibilityUnavailable)) throw error;
      skipped("closing the window", `UI scripting is not allowed here: ${error.message}`);
      return ctx.end(app);
    }
    await ctx.screen.expectShown(false, 10_000);
    await sleep(1000);
    if (!app.running) throw new SmokeFailure("the app still running in the tray", app.describe());
    ok("closing the window hides it, and the app keeps running in the tray");
    await ctx.launch().expectExit("a second launch");
    await ctx.screen.expectShown(true);
    // Where the platform can tell (X11), the window has the keyboard too.
    if (ctx.screen.focused() !== null) {
      await eventually("the window brought back focused", ctx.screen.focused);
    }
    ok("a second launch brings the hidden window back");
    await ctx.end(app);
  },

  /**
   * The login entry's own command line starts the app hidden in the tray; a
   * second login launch leaves it hidden, a launch by hand shows it.
   */
  async "login-launch"(ctx) {
    // A day to roll over, so the launch is seen to have booted.
    database.put({ dayState: dayState({ date: YESTERDAY }) });
    const entry = existingLoginEntry();
    const app = ctx.launch(entry.args, entry.program);
    await eventually("the login launch booting (rolling the day over)", dayIsToday, {
      timeoutMs: 30_000,
      found: storedDay,
    });
    await ctx.screen.expectStaysHidden("after a login launch", 3000);
    ok("the login entry's command line starts the app hidden in the tray");
    await ctx.launch([AUTOSTART_ARG]).expectExit("a second login launch");
    await ctx.screen.expectStaysHidden("after a second login launch");
    await ctx.launch().expectExit("a second launch by hand");
    await ctx.screen.expectShown(true);
    ok("a second login launch leaves it hidden; a launch by hand shows it");
    await ctx.end(app);
  },

  /**
   * The tray menu (where the platform lets it be read): where the day stands,
   * and its five entries. The workday is all day, so whenever the check runs
   * the day can be skipped (outside it, the entry would offer to nudge it).
   */
  async "tray-menu"(ctx) {
    database.startDay(1, ALL_DAY);
    const app = ctx.launch();
    await ctx.screen.expectShown(true, 60_000);
    await eventually("the frontend storing today's day state", dayIsToday, { found: storedDay });
    const menu = async () => JSON.stringify(await ctx.trayMenu());
    try {
      await menu();
    } catch (error) {
      if (!(error instanceof AccessibilityUnavailable)) throw error;
      skipped("the tray menu and its Quit", `UI scripting is not allowed here: ${error.message}`);
      return ctx.end(app);
    }
    // The frontend updates the menu once it has booted.
    await eventually(
      `the tray menu ${JSON.stringify(TRAY_MENU)}`,
      async () => (await menu()) === JSON.stringify(TRAY_MENU),
      { found: menu },
    );
    ok(
      "the tray menu: where the day stands, Start next set, Pause nudges, Skip today, Open Nabd, Quit",
    );
    await ctx.quitFromTray();
    await expectCleanExit(app, "the tray's Quit");
    ok("the tray's Quit ends the app, with the database sound");
  },

  /** (WebDriver) A set logged in the window is a row of the history table; it and Pause survive a restart. */
  async "logged-set"(ctx) {
    if (!needsWebDriver(ctx, "logging a set")) return;
    database.startDay(1);
    await runAct("log-a-set", ctx.driverUrl, ctx.binary);
    expectEqual("the history table", database.history(), [LOGGED_SET]);
    expectEqual("pause in the database", database.stored("dayState", ".paused"), 1);
    ok("a set logged in the window is a row of the history table; Pause is stored");
    await runAct("after-restart", ctx.driverUrl, ctx.binary);
    expectEqual("the history table after a restart", database.history(), [LOGGED_SET]);
    ok("after a restart the window still counts the set and nudges are still paused");
  },

  /**
   * (WebDriver, with a tray) A window a nudge brought back from the tray, on a
   * day then skipped, hides again when it is closed. Nobody is at the computer,
   * so an idle moment nudges once the minimum gap after the launch is over.
   */
  async "close-after-nudge"(ctx) {
    if (!needsWebDriver(ctx, "closing a window a nudge brought back")) return;
    database.startDay(1, { ...ALL_DAY, interval: 60, minGap: 1, idleNudge: 5 });
    await runAct("close-after-nudge", ctx.driverUrl, ctx.binary);
    ok("a window a nudge brought back, on a day then skipped, hides again when closed");
  },

  /** (WebDriver) Settings → "Open at startup" removes the login entry and writes it back. */
  async "autostart-setting"(ctx) {
    if (!needsWebDriver(ctx, 'Settings → "Open at startup"')) return;
    await runAct("toggle-autostart", ctx.driverUrl, ctx.binary);
    if (loginEntry() !== null) {
      throw new SmokeFailure(
        `no login entry at ${loginEntryLocation()} once "Open at startup" is off`,
        JSON.stringify(loginEntry()),
      );
    }
    ok('switching "Open at startup" off removes the login entry');
    await runAct("toggle-autostart", ctx.driverUrl, ctx.binary);
    expectLoginEntry(ctx.binary);
    ok("switching it on writes the entry again");
    if (ctx.tray) return;
    const app = ctx.launch([AUTOSTART_ARG]);
    await ctx.screen.expectShown(true, 60_000);
    ok("a login launch on a desktop with no tray shows the window");
    await ctx.end(app);
  },

  /** (WebDriver, after logged-set) Settings → Quit Nabd ends the app with what it logged on disk. */
  async "quit-from-settings"(ctx) {
    if (!needsWebDriver(ctx, "Settings → Quit Nabd")) return;
    await runAct("quit-from-settings", ctx.driverUrl, ctx.binary);
    await eventually("the app gone after Settings → Quit Nabd", () => instances(ctx.binary) === 0, {
      found: () => `${instances(ctx.binary)} Nabd process(es)`,
    });
    if (!database.isClean()) throw new SmokeFailure("a sound database after quitting");
    expectEqual("the history table after quitting", database.history(), [LOGGED_SET]);
    ok("Settings → Quit Nabd saves and ends the app; the set is on disk, the database sound");
  },

  /** (WebDriver) The clock beat carries the system's idle seconds, reset by input. */
  async "system-idle"(ctx) {
    if (!needsWebDriver(ctx, "the system's idle time")) return;
    try {
      await runAct("system-idle", ctx.driverUrl, ctx.binary);
      ok("the clock beat carries the system's idle seconds, which input resets");
    } catch (error) {
      if (!(error instanceof SyntheticInputUnavailable)) throw error;
      ok(
        "the clock beat carries the system's idle seconds, growing while nobody is at the computer",
      );
      skipped("input resetting them", `the session took no synthetic input: ${error.message}`);
    }
  },
};
