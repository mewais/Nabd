// The desktop around the app, as the WebDriver acts (app-session.mjs) see and
// drive it: the app's wall clock, the notifications it raised, its tray menu,
// its window, and the idle time it is told. linux-smoke.sh sets the session up
// and says where everything is through the environment:
//
//   NABD_SMOKE_CLOCK          the libfaketime offset file the app's clock reads
//   NABD_SMOKE_NOTIFICATIONS  the log the fake notification service writes
//   NABD_SMOKE_PYTHON         a Python with D-Bus bindings, for desktop_bus.py

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const POLL_MS = 250;

/** Poll `check` until it returns something other than undefined, or fail with `what`. */
async function eventually(what, check, timeoutMs = 15_000) {
  for (let waited = 0; waited < timeoutMs; waited += POLL_MS) {
    const result = check();
    if (result !== undefined) return result;
    await sleep(POLL_MS);
  }
  throw new Error(`timed out: ${what}`);
}

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
    write(Math.round((target.getTime() - Date.now()) / 1000));
  },

  /** Move the app's clock on by `minutes`. */
  advance(minutes) {
    write(Number(readFileSync(process.env.NABD_SMOKE_CLOCK, "utf8")) + minutes * 60);
  },
};

const write = (offset) =>
  writeFileSync(process.env.NABD_SMOKE_CLOCK, `${offset >= 0 ? "+" : ""}${offset}\n`);

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
    const shown = await eventually(`notification #${count}`, () => {
      const all = this.all();
      return all.length >= count ? all : undefined;
    });
    if (shown.length > count) throw new Error(`more than ${count} notifications: ${JSON.stringify(shown)}`);
    return shown[count - 1];
  },

  /** Watch for `ms` and fail if the count goes past `count`. */
  async expectNoMoreThan(count, ms = 4000) {
    await sleep(ms);
    const all = this.all();
    if (all.length > count) {
      throw new Error(`unexpected notification: ${JSON.stringify(all.slice(count))}`);
    }
  },
};

/** Assert that a notification says what the README promises for a nudge. */
export function expectNudge(notification, body) {
  const expected = { title: "Time to move", body };
  if (notification.title !== expected.title || notification.body !== expected.body) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(notification)}`);
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
    eventually(`a tray menu entry "${label}"`, () =>
      tray.menu().includes(label) ? true : undefined,
    ),
};

const x11 = (command) => {
  try {
    return execFileSync(here("x11.sh"), [command], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

/** The app's window, as the X server sees it. */
export const screen = {
  shown: () => x11("shown") !== null,
  focused: () => x11("focused") !== null,
  close: () => x11("close"),
  touch: () => x11("touch"),

  expectShown: (shown) =>
    eventually(`the window ${shown ? "shown" : "hidden"}`, () =>
      screen.shown() === shown ? true : undefined,
    ),

  /** Keep touching the mouse until the returned function is called. */
  busy() {
    const timer = setInterval(() => screen.touch(), 500);
    return () => clearInterval(timer);
  },
};

/**
 * The idle seconds the app's clock beat carries, as the frontend receives
 * them over `ms`: listening to the backend's `tick` event the way the app
 * itself does (@tauri-apps/api's `listen`, which goes through the Tauri
 * internals every Tauri page has).
 */
export function idleTicks(app, ms) {
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
