// Drives the real Nabd window through WebDriver (tauri-driver in front of the
// platform's driver: WebKitWebDriver on Linux, msedgedriver on Windows). Each
// act starts the app, does its part and closes the app again; the caller sets
// up the stored data an act starts from and checks the database and the files
// afterwards (checks.mjs, and linux-smoke.sh for the Linux-only acts, through
// the command line at the bottom). The window shows a change before the app
// has stored it, and ending the session can end the app at once (msedgedriver
// does), so an act whose change the caller looks for waits until it is stored.
//
//   node scripts/smoke/app-session.mjs <act> <driver-url> <nabd-binary>

import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import {
  QUIT_GRACE_MS,
  SmokeFailure,
  database,
  eventually,
  instances,
  isMain,
  loginEntry,
} from "./app.mjs";
import { clock, expectNudge, notifications, tray } from "./linux-desktop.mjs";
import { screenFor } from "./screen.mjs";
import { Session } from "./webdriver.mjs";

/** What the nudges for the smoke plan's one exercise say, by what prompted them. */
const NUDGE = {
  timer: "Push-Up — Interval's up",
  idle: "Push-Up — You've gone quiet",
};

/** The acts every platform with a WebDriver has: each `(app, screen, binary)`. */
const ACTS = {
  /** Pause nudges, then log the one set of the smoke plan. */
  async "log-a-set"(app) {
    await app.press("Pause");
    await app.waitForButton("Resume");
    await logOneSet(app);
    await stored(
      "the set in the history table",
      () => database.history().length === 1,
      () => JSON.stringify(database.history()),
    );
    await stored(
      "pause in the stored day state",
      () => database.stored("dayState", ".paused"),
      () => database.value("dayState"),
    );
  },

  /** After a restart on the same day: the set is still counted and nudges are still paused. */
  async "after-restart"(app) {
    await app.waitForText("1/1 set");
    await app.waitForText("Day complete");
    await app.waitForButton("Resume");
  },

  /** Settings → "Open at startup", flipped once (the caller looks at the login entry). */
  async "toggle-autostart"(app) {
    await app.pressNamed("Settings");
    const row = "//*[@role='group'][@aria-label='Open at startup']//*[@role='switch']";
    const on = (await app.attribute(await app.waitFor(row), "aria-checked")) !== "true";
    await app.toggle("Open at startup");
    await app.waitFor(`${row}[@aria-checked='${on}']`);
    await stored(
      `"Open at startup" ${on ? "on" : "off"} in the stored settings`,
      () => database.stored("settings", ".openAtStartup") === (on ? 1 : 0),
      () => database.value("settings"),
    );
    await stored(
      `the login entry ${on ? "written" : "removed"}`,
      () => (loginEntry() !== null) === on,
      () => JSON.stringify(loginEntry()),
    );
  },

  /** Settings → Quit Nabd: the window saves, then the app exits (the caller sees it go). */
  async "quit-from-settings"(app) {
    await app.waitForText("Day complete");
    await app.pressNamed("Settings");
    await app.pressToQuit("Quit Nabd");
  },

  /**
   * The idle seconds of the clock beat grow while nobody is at the computer,
   * and synthetic input resets them: the system's idle time, not the
   * window's (X11 under Linux, a compositor's under Wayland, GetLastInputInfo
   * on Windows).
   */
  async "system-idle"(app, screen) {
    const idle = await idleTicks(app, 6500);
    if (!(Math.max(...idle) >= 5 && idle.every((s, i) => i === 0 || s >= idle[i - 1]))) {
      throw new SmokeFailure(
        "with nobody at the computer, idle seconds that grow past 5",
        JSON.stringify(idle),
      );
    }
    const stop = await screen.busy();
    const busy = await idleTicks(app, 3000);
    stop();
    if (Math.max(...busy) > 1) {
      throw new SmokeFailure("input to reset the idle seconds (at most 1)", JSON.stringify(busy));
    }
  },
};

/** The acts that need the Linux desktop's fakes (linux-desktop.mjs). */
const LINUX_ACTS = {
  /**
   * A window that cannot answer does not keep the app from quitting: with the
   * page's script stuck in a loop, the tray's Quit still ends the app — once
   * the window has had its grace (three seconds) to save.
   */
  async "unanswered-quit"(app, _screen, binary) {
    await app.waitForButton("Start set");
    await app.run("const done = arguments[0]; setTimeout(() => { for (;;); }, 100); done();");
    await sleep(500);
    const asked = Date.now();
    tray.click("Quit");
    await eventually("the app gone, though the window never answered", () => !instances(binary), {
      timeoutMs: 15_000,
      found: () => `${instances(binary)} Nabd process(es)`,
    });
    const waited = Date.now() - asked;
    if (waited < QUIT_GRACE_MS - 1000) {
      throw new SmokeFailure("the window given its grace before the app exits", `${waited} ms`);
    }
  },

  /** The tray's "Start next set" brings the hidden window back with the logger open. */
  async "tray-start"(app, screen) {
    await app.waitForButton("Start set");
    screen.close();
    await screen.expectShown(false);
    tray.click("Start next set");
    await screen.expectShown(true);
    await app.waitForButton("Log this set");
  },

  /**
   * The timer nudge, from 08:55 on a workday of 09:00–17:00 with a 5-minute
   * interval (and an idle moment too long to come first): nothing before the
   * workday, a notification when the interval is up, repeated once per
   * interval, silenced by Snooze and Pause, and nothing after the workday.
   */
  async "timer-nudges"(app, screen) {
    await app.waitForText("Quiet until 09:00");
    screen.close();
    await screen.expectShown(false);

    clock.advance(8); // 09:03: the workday began three minutes ago
    await notifications.expectNoMoreThan(0);
    clock.advance(3); // 09:06: five minutes into the workday
    expectNudge(await notifications.expect(1), NUDGE.timer);
    await screen.expectShownUnfocused();

    clock.advance(6); // 09:12: unanswered for an interval
    expectNudge(await notifications.expect(2), NUDGE.timer);

    await app.press("Snooze"); // for five minutes: until 09:17
    screen.close();
    await screen.expectShown(false);
    clock.advance(3); // 09:15
    await notifications.expectNoMoreThan(2);
    clock.advance(3); // 09:18
    expectNudge(await notifications.expect(3), NUDGE.timer);
    // Brought back again (the window has had a click since it was first shown).
    await screen.expectShownUnfocused();

    tray.click("Pause nudges");
    await tray.expectEntry("Resume nudges");
    clock.advance(10); // 09:28
    await notifications.expectNoMoreThan(3);
    tray.click("Resume nudges"); // the interval has long been up
    expectNudge(await notifications.expect(4), NUDGE.timer);

    clock.at(17, 1); // the workday is over
    await app.waitForText("Quiet until 09:00");
    await notifications.expectNoMoreThan(4);
  },

  /**
   * Idle time, at 10:00 on an all-day workday with a 2-minute minimum gap, a
   * 5-second idle moment and an hour's interval: the clock beat carries the
   * X server's idle seconds, which synthetic input resets; after a set an idle
   * moment nudges only once the minimum gap has passed, and only while nobody
   * is at the keyboard or mouse.
   */
  async "idle-nudges"(app, screen) {
    await ACTS["system-idle"](app, screen);
    await logOneSet(app);
    await app.pressNamed("Close");
    screen.close();
    await screen.expectShown(false);

    clock.advance(1); // 10:01: idle, but within the minimum gap after the set
    await notifications.expectNoMoreThan(0);
    const stopBusy = await screen.busy();
    clock.advance(2); // 10:03: past the gap, but someone is at the mouse
    await notifications.expectNoMoreThan(0);
    stopBusy();
    expectNudge(await notifications.expect(1), NUDGE.idle);
  },
};

/** Wait until `check` says the app has stored what the window shows; `found` says what is stored. */
function stored(expectation, check, found) {
  return eventually(expectation, check, { timeoutMs: 10_000, found });
}

async function logOneSet(app) {
  await app.press("Start set");
  await app.press("Log this set");
  await app.waitForText("1 set logged today");
}

/**
 * The idle seconds the app's clock beat carries, as the frontend receives
 * them over `ms`: listening to the backend's `tick` event the way the app
 * itself does (@tauri-apps/api's `listen`, which goes through the Tauri
 * internals every Tauri page has).
 */
function idleTicks(app, ms) {
  return app.run(
    `const [ms, done] = arguments;
     const tauri = window.__TAURI_INTERNALS__;
     const seen = [];
     const handler = tauri.transformCallback((event) => seen.push(event.payload.idleSeconds));
     tauri
       .invoke("plugin:event|listen", { event: "tick", target: { kind: "Any" }, handler })
       .then(() => setTimeout(() => done(seen), ms), (error) => done(String(error)));`,
    ms,
  );
}

const ALL_ACTS = { ...ACTS, ...LINUX_ACTS };

/** Start the app from `binary` under the driver at `driverUrl`, do act `name`, and close the app. */
export async function runAct(name, driverUrl, binary) {
  const act = ALL_ACTS[name];
  if (act === undefined) throw new Error(`no act named ${name}`);
  const app = await Session.start(driverUrl, binary);
  try {
    await act(app, screenFor(binary), binary);
  } finally {
    // An act that quits the app leaves no session to end.
    await app.end().catch(() => {});
  }
}

if (isMain(import.meta.url)) {
  const [name, driverUrl, binary] = process.argv.slice(2);
  if (!(name in ALL_ACTS) || driverUrl === undefined || binary === undefined) {
    console.error(
      `usage: app-session.mjs <${Object.keys(ALL_ACTS).join("|")}> <driver-url> <binary>`,
    );
    process.exit(2);
  }
  await runAct(name, driverUrl, binary);
}
