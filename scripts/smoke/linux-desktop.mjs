// The Linux desktop services around the app, as the WebDriver acts
// (app-session.mjs) drive and read them: the app's wall clock (libfaketime),
// the notifications it raised and its tray menu (the fakes of desktop_bus.py).
// linux-smoke.sh sets the session up and says where everything is:
//
//   NABD_SMOKE_CLOCK          the libfaketime offset file the app's clock reads
//   NABD_SMOKE_NOTIFICATIONS  the log the fake notification service writes
//   NABD_SMOKE_PYTHON         a Python with D-Bus bindings, for desktop_bus.py

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { SmokeFailure, eventually } from "./app.mjs";

const here = (file) => fileURLToPath(new URL(file, import.meta.url));

/**
 * The app's wall clock, moved by libfaketime: the offset file holds how many
 * seconds the app's clock is ahead of (or behind) the real one, and is read on
 * every call. Monotonic time is left alone, so timers and the one-second beat
 * keep pace. linux-smoke.sh sets the time an act starts at.
 */
export const clock = {
  /** Put the app's clock at `hours:minutes` of today. */
  at(hours, minutes) {
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    writeOffset(Math.round((target.getTime() - Date.now()) / 1000));
  },

  /** Move the app's clock on by `minutes`. */
  advance(minutes) {
    writeOffset(Number(readFileSync(process.env.NABD_SMOKE_CLOCK, "utf8")) + minutes * 60);
  },
};

const writeOffset = (seconds) =>
  writeFileSync(process.env.NABD_SMOKE_CLOCK, `${seconds >= 0 ? "+" : ""}${seconds}\n`);

/** What the fake notification service was asked to show, oldest first. */
export const notifications = {
  all() {
    const log = process.env.NABD_SMOKE_NOTIFICATIONS;
    if (!existsSync(log)) return [];
    return readFileSync(log, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  },

  /** Wait for notification number `count` (1-based) and return it. */
  async expect(count) {
    const shown = await eventually(
      `notification #${count}`,
      () => (this.all().length >= count ? this.all() : undefined),
      { found: () => JSON.stringify(this.all()) },
    );
    if (shown.length > count) {
      throw new SmokeFailure(`no more than ${count} notifications`, JSON.stringify(shown));
    }
    return shown[count - 1];
  },

  /** Watch for `ms` and fail if the count goes past `count`. */
  async expectNoMoreThan(count, ms = 4000) {
    await sleep(ms);
    const all = this.all();
    if (all.length > count) {
      throw new SmokeFailure(`no notification after #${count}`, JSON.stringify(all.slice(count)));
    }
  },
};

/** Fail unless a notification says what the README promises for a nudge. */
export function expectNudge(notification, body) {
  const expected = { title: "Time to move", body };
  if (notification.title !== expected.title || notification.body !== expected.body) {
    throw new SmokeFailure(`the nudge ${JSON.stringify(expected)}`, JSON.stringify(notification));
  }
}

const bus = (...args) =>
  execFileSync(process.env.NABD_SMOKE_PYTHON, [here("desktop_bus.py"), ...args], {
    encoding: "utf8",
  });

/** The app's tray item, through the fake StatusNotifier host. */
export const tray = {
  /** Its menu entries' labels, a disabled one marked " (disabled)". */
  menu: () => bus("tray-menu").trim().split("\n"),
  click: (label) => bus("tray-click", label),

  /** Wait until the menu has an entry labelled exactly `label`. */
  expectEntry: (label) =>
    eventually(`a tray menu entry "${label}"`, () => tray.menu().includes(label), {
      found: () => tray.menu().join(" | "),
    }),
};
