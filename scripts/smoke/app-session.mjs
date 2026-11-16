// Drives the real Nabd window through WebDriver (tauri-driver in front of
// WebKitWebDriver), for scripts/smoke/linux-smoke.sh, which sets up the
// session and the stored data each act starts from, and checks the database
// and the files between the acts.
//
//   node scripts/smoke/app-session.mjs <act> <driver-url> <nabd-binary>
//
// Each act starts the app, does its part and closes the app again.

import process from "node:process";
import { clock, expectNudge, idleTicks, notifications, screen, tray } from "./desktop.mjs";
import { Session } from "./webdriver.mjs";

/** What the nudges for the smoke plan's one exercise say, by what prompted them. */
const NUDGE = {
  timer: "Push-Up — Interval's up",
  idle: "Push-Up — You've gone quiet",
};

const ACTS = {
  /** Pause nudges, then log the one set of the plan the smoke test stored. */
  async "log-a-set"(app) {
    await app.press("Pause");
    await app.waitForButton("Resume");
    await logOneSet(app);
  },

  /** After a restart on the same day: the set is still counted and nudges are still paused. */
  async "after-restart"(app) {
    await app.waitForText("1/1 set");
    await app.waitForText("Day complete");
    await app.waitForButton("Resume");
  },

  /** Settings → "Open at startup", flipped once (linux-smoke.sh looks at the login entry). */
  async "toggle-autostart"(app) {
    await app.pressNamed("Settings");
    const row = "//*[@role='group'][@aria-label='Open at startup']//*[@role='switch']";
    const before = await app.attribute(await app.waitFor(row), "aria-checked");
    await app.toggle("Open at startup");
    await app.waitFor(`${row}[@aria-checked='${before === "true" ? "false" : "true"}']`);
  },

  /** The tray's "Start next set" brings the hidden window back with the logger open. */
  async "tray-start"(app) {
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
  async "timer-nudges"(app) {
    await app.waitForText("Quiet until 09:00");
    screen.close();
    await screen.expectShown(false);

    clock.advance(8); // 09:03: the workday began three minutes ago
    await notifications.expectNoMoreThan(0);
    clock.advance(3); // 09:06: five minutes into the workday
    expectNudge(await notifications.expect(1), NUDGE.timer);
    // The window hidden in the tray is brought back, without the keyboard.
    await screen.expectShown(true);
    if (screen.focused()) throw new Error("the nudge brought the window back focused");

    clock.advance(6); // 09:12: unanswered for an interval
    expectNudge(await notifications.expect(2), NUDGE.timer);

    await app.press("Snooze"); // for five minutes: until 09:17
    screen.close();
    await screen.expectShown(false);
    clock.advance(3); // 09:15
    await notifications.expectNoMoreThan(2);
    clock.advance(3); // 09:18
    expectNudge(await notifications.expect(3), NUDGE.timer);

    tray.click("Pause nudges");
    await tray.expectEntry("Resume nudges");
    clock.advance(10); // 09:28
    await notifications.expectNoMoreThan(3);
    tray.click("Resume nudges"); // the interval has long been up
    await new Promise((r) => setTimeout(r, 3000));
    console.error("DBG", JSON.stringify(await app.run("arguments[0]([document.hasFocus(), document.visibilityState, document.body.innerText.slice(0,400)])")), screen.focused(), screen.shown());
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
  async "idle-nudges"(app) {
    const idle = await idleTicks(app, 6500);
    if (!(Math.max(...idle) >= 5 && idle.every((s, i) => i === 0 || s >= idle[i - 1]))) {
      throw new Error(`with nobody at the computer the idle time should grow past 5 s: ${idle}`);
    }
    const stop = screen.busy();
    const busy = await idleTicks(app, 3000);
    stop();
    if (Math.max(...busy) > 1) throw new Error(`moving the mouse should reset the idle time: ${busy}`);

    await logOneSet(app);
    await app.pressNamed("Close");
    screen.close();
    await screen.expectShown(false);

    clock.advance(1); // 10:01: idle, but within the minimum gap after the set
    await notifications.expectNoMoreThan(0);
    const stopBusy = screen.busy();
    clock.advance(2); // 10:03: past the gap, but someone is at the mouse
    await notifications.expectNoMoreThan(0);
    stopBusy();
    expectNudge(await notifications.expect(1), NUDGE.idle);
  },
};

async function logOneSet(app) {
  await app.press("Start set");
  await app.press("Log this set");
  await app.waitForText("1 set logged today");
}

const [name, driverUrl, binary] = process.argv.slice(2);
const act = ACTS[name];
if (act === undefined || driverUrl === undefined || binary === undefined) {
  console.error(`usage: app-session.mjs <${Object.keys(ACTS).join("|")}> <driver-url> <binary>`);
  process.exit(2);
}

const app = await Session.start(driverUrl, binary);
try {
  await act(app);
} finally {
  await app.end();
}
