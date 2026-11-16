import type { ShellInput, ShellVM } from "@nabd/shell";
import { nov } from "../support/domain-factories";
import { shellVM } from "./fixtures";

describe("buildShellVM · greeting and date", () => {
  it.each([
    [0, "Good morning"],
    [11, "Good morning"],
    [12, "Good afternoon"],
    [17, "Good afternoon"],
    [18, "Good evening"],
    [23, "Good evening"],
  ])("at %i o'clock greets with %s", (hour, expected) => {
    expect(shellVM({ now: nov(16, hour) }).topBar.greeting).toBe(expected);
  });

  it("labels the date with the upper-case weekday, the short month and the day", () => {
    const date = (now: Date): string => shellVM({ now }).topBar.date;
    expect(date(nov(16, 10, 30))).toBe("MONDAY · Nov 16");
    expect(date(new Date(2023, 0, 1, 0, 0))).toBe("SUNDAY · Jan 1");
    expect(date(new Date(2026, 6, 4, 23, 59))).toBe("SATURDAY · Jul 4");
  });
});

describe("buildShellVM · nudge status", () => {
  const status = (overrides: Partial<ShellInput>): ShellVM["topBar"]["status"] =>
    shellVM(overrides).topBar.status;

  it("shows the clock and when the next nudge comes while waiting", () => {
    expect(status({})).toEqual({
      clock: "10:30",
      line: "Next nudge at 11:20, sooner if you go idle",
      due: false,
    });
  });

  it("is due, with the reason, once a nudge has fired", () => {
    expect(status({ nudge: { state: "due", reason: "timer" } })).toMatchObject({
      line: "Interval's up",
      due: true,
    });
    expect(status({ nudge: { state: "due", reason: "idle" } })).toMatchObject({
      line: "You've gone quiet",
      due: true,
    });
  });

  it("says until when it stays quiet outside the workday", () => {
    const early = status({ now: nov(16, 7), nudge: { state: "off_hours", at: nov(16, 9) } });
    expect(early).toEqual({ clock: "07:00", line: "Quiet until 09:00", due: false });
  });

  it("says so when nudges are paused or nothing is left", () => {
    expect(status({ paused: true, nudge: { state: "paused" } }).line).toBe("Nudges paused");
    expect(status({ nudge: { state: "nothing_left" } }).line).toBe("Nothing left today");
  });
});

describe("buildShellVM · sidebar", () => {
  it("carries the current screen and the version without its patch number", () => {
    const { sidebar } = shellVM({ screen: "planner", version: "1.4.2" });
    expect(sidebar.screen).toBe("planner");
    expect(sidebar.versionLabel).toBe("PULSE · v1.4");
  });

  it("turns today's sets into a count, a total and a percentage", () => {
    const { progress } = shellVM({ sets: { setsDone: 3, setsPlanned: 12 } }).sidebar;
    expect(progress).toEqual({ done: 3, totalLabel: "of 12 sets", pct: 25 });
  });

  it("counts one set in the singular and rounds the percentage", () => {
    const one = shellVM({ sets: { setsDone: 1, setsPlanned: 1 } }).sidebar;
    expect(one.progress).toEqual({ done: 1, totalLabel: "of 1 set", pct: 100 });
    const third = shellVM({ sets: { setsDone: 1, setsPlanned: 3 } }).sidebar;
    expect(third.progress.pct).toBe(33);
  });

  it("shows an empty ring when nothing is planned", () => {
    const { progress } = shellVM({ sets: { setsDone: 0, setsPlanned: 0 } }).sidebar;
    expect(progress).toEqual({ done: 0, totalLabel: "of 0 sets", pct: 0 });
  });
});

describe("buildShellVM · theme, glass, pause and notice", () => {
  it("passes the theme and tint strength through", () => {
    const vm = shellVM({ settings: { theme: "light", glass: false, opacity: 0.4 } });
    expect(vm).toMatchObject({ theme: "light", opacity: 0.4, topBar: { theme: "light" } });
  });

  it("offers glass, and turns it on when the setting is on, where the platform has it", () => {
    const vm = shellVM({
      settings: { theme: "dark", glass: true, opacity: 0.7 },
      glassSupported: true,
    });
    expect(vm.glass).toBe(true);
    expect(vm.topBar).toMatchObject({ glassAvailable: true, glass: true });
  });

  it("neither offers nor applies a stored glass setting where the platform lacks it", () => {
    const vm = shellVM({
      settings: { theme: "dark", glass: true, opacity: 0.7 },
      glassSupported: false,
    });
    expect(vm.glass).toBe(false);
    expect(vm.topBar).toMatchObject({ glassAvailable: false, glass: false });
  });

  it("reports whether nudges are paused", () => {
    expect(shellVM({ paused: false }).topBar.paused).toBe(false);
    expect(shellVM({ paused: true }).topBar.paused).toBe(true);
  });

  it("carries the app notice, or none", () => {
    expect(shellVM().notice).toBeNull();
    const notice = { kind: "error", text: "Could not save" } as const;
    expect(shellVM({ notice }).notice).toEqual(notice);
  });
});
