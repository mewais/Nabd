/**
 * @nabd/modals — buildSettingsVM: every setting in readable units, the
 * patch each control applies, and what this computer offers.
 */

import { DEFAULT_SETTINGS } from "@nabd/domain";
import type { Settings } from "@nabd/domain";
import { buildSettingsVM } from "@nabd/modals";
import type { SettingsVM } from "@nabd/modals";

type Input = Parameters<typeof buildSettingsVM>[0];

function build(settings: Partial<Settings> = {}, over: Partial<Omit<Input, "settings">> = {}) {
  return buildSettingsVM({
    settings: { ...DEFAULT_SETTINGS, ...settings },
    capabilities: { tray: true, glass: true, idle: true },
    notice: null,
    ...over,
  });
}

/** The stepper row titled `title`, wherever it is. */
function stepper(vm: SettingsVM, title: string) {
  const rows = [...vm.workday.hours, ...vm.nudges, vm.training.increment, vm.appearance.opacity];
  const row = rows.find((candidate) => candidate?.title === title);
  if (!row) throw new Error(`no stepper row "${title}"`);
  return row;
}

describe("buildSettingsVM", () => {
  it("shows the current values in readable units", () => {
    const vm = build({ glass: true });
    const value = (title: string) => stepper(vm, title).value;

    expect(value("Starts")).toBe("09:00");
    expect(value("Ends")).toBe("18:00");
    expect(value("Interval")).toBe("50 min");
    expect(value("Minimum gap")).toBe("15 min");
    expect(value("Idle moment")).toBe("30 sec");
    expect(value("Weight increment")).toBe("2.5 kg");
    expect(value("Background opacity")).toBe("70%");
  });

  it("moves the workday bounds in half-hour steps", () => {
    const vm = build();
    expect(stepper(vm, "Starts")).toMatchObject({
      decrease: { workStart: 8 * 60 + 30 },
      increase: { workStart: 9 * 60 + 30 },
    });
    expect(stepper(vm, "Ends")).toMatchObject({
      decrease: { workEnd: 17 * 60 + 30 },
      increase: { workEnd: 18 * 60 + 30 },
    });
  });

  it("carries the weekdays that are worked", () => {
    expect(build().workday.days).toEqual([1, 2, 3, 4, 5]);
    expect(build({ workDays: [0, 6] }).workday.days).toEqual([0, 6]);
  });

  it("moves the nudge timings in steps of five", () => {
    const vm = build();
    expect(stepper(vm, "Interval").increase).toEqual({ interval: 55 });
    expect(stepper(vm, "Minimum gap").decrease).toEqual({ minGap: 10 });
    expect(stepper(vm, "Idle moment").decrease).toEqual({ idleNudge: 25 });
  });

  it("steps the weight increment by a quarter, in the active unit, without floating-point dust", () => {
    const kg = stepper(build({ weightIncrement: 2.5 }), "Weight increment");
    expect(kg).toMatchObject({
      decrease: { weightIncrement: 2.25 },
      increase: { weightIncrement: 2.75 },
    });

    const lb = stepper(build({ weightUnit: "lb", weightIncrement: 0.3 }), "Weight increment");
    expect(lb.value).toBe("0.3 lb");
    expect(lb.increase).toEqual({ weightIncrement: 0.55 });
  });

  it("carries the unit, the owned equipment and the theme", () => {
    const vm = build({ weightUnit: "lb", equipment: ["bodyweight", "barbell"], theme: "light" });
    expect(vm.training.unit).toBe("lb");
    expect(vm.training.equipment).toEqual(["bodyweight", "barbell"]);
    expect(vm.appearance.theme).toBe("light");
  });

  it("offers opacity only while the translucent window is on", () => {
    const off = build({ glass: false }).appearance;
    expect(off.glass).toMatchObject({ on: false, flip: { glass: true } });
    expect(off.opacity).toBeNull();

    const on = build({ glass: true, opacity: 0.7 }).appearance;
    expect(on.glass).toMatchObject({ on: true, flip: { glass: false } });
    expect(on.opacity).toMatchObject({ decrease: { opacity: 0.65 }, increase: { opacity: 0.75 } });
  });

  it("offers no translucency where the window cannot be translucent", () => {
    const { appearance } = build(
      { glass: true },
      { capabilities: { tray: true, glass: false, idle: true } },
    );
    expect(appearance.glass).toBeNull();
    expect(appearance.opacity).toBeNull();
  });

  it("flips the startup switches", () => {
    const { startup } = build({ openAtStartup: true, minimizedByDefault: false });
    expect(startup.map((row) => [row.title, row.on, row.flip])).toEqual([
      ["Open at startup", true, { openAtStartup: false }],
      ["Start minimized", false, { minimizedByDefault: true }],
    ]);
  });

  it("without a tray, Start minimized cannot be switched and says why", () => {
    const minimized = (tray: boolean) =>
      build({}, { capabilities: { tray, glass: true, idle: true } }).startup[1]!;
    expect(minimized(true)).toMatchObject({
      disabled: false,
      hint: "Sit quietly in the tray until a set is due.",
    });
    expect(minimized(false)).toMatchObject({
      disabled: true,
      hint: "This desktop shows no tray icons, so Nabd always opens as a window.",
    });
    expect(build().startup[0]!.disabled).toBe(false);
  });

  it("says Open at startup begins in the tray where there is one, and in a window where not", () => {
    const hint = (tray: boolean) =>
      build({}, { capabilities: { tray, glass: true, idle: true } }).startup[0]!.hint;
    expect(hint(true)).toBe("Launch Nabd when you log in, quietly in the tray.");
    expect(hint(false)).toBe("Launch Nabd when you log in.");
  });

  it("says what a change of unit does to the weight increment", () => {
    expect(build().training.increment.hint).toMatch(/2\.5 kg ↔ 5 lb/);
    expect(build().training.increment.hint).toMatch(/a step of your own as it is/);
  });

  it("says what an idle moment means where the system cannot report idle time", () => {
    const hint = (idle: boolean): string =>
      stepper(build({}, { capabilities: { tray: true, glass: true, idle } }), "Idle moment").hint;

    expect(hint(true)).toBe(
      "Once the minimum gap has passed, this long without keyboard or mouse nudges early.",
    );
    expect(hint(false)).toMatch(/System idle detection is unavailable on this desktop/);
    expect(hint(false)).toMatch(/activity inside Nabd/);
  });

  it("carries the outcome of the last import or export", () => {
    const failure = { kind: "error", text: "Not a Nabd file" } as const;
    expect(build().notice).toBeNull();
    expect(build({}, { notice: failure }).notice).toEqual(failure);
  });
});
