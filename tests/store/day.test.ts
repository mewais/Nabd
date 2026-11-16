import type { Program } from "@nabd/domain";
import { DEFAULT_SETTINGS, dateKey } from "@nabd/domain";
import { createNabdStore } from "@nabd/store";
import { nov } from "../support/builders";
import { CATALOG } from "../support/exercises";
import { catalogBenchRow, catalogPushPull } from "../support/programs";
import { boot, fakeBackend } from "./fixtures";

describe("booting", () => {
  it("a fresh install starts with an empty plan and default settings", async () => {
    const app = await boot({});
    expect(app.get()).toMatchObject({ booted: true, settings: DEFAULT_SETTINGS, history: [] });
    expect(app.plan().items).toEqual([]);
    expect(app.get().dayState.date).toBe(dateKey(nov(16)));
  });

  it("fills settings saved by an older version with the new defaults", async () => {
    const app = await boot({ settings: { theme: "light", interval: 30 } });
    expect(app.get().settings).toEqual({ ...DEFAULT_SETTINGS, theme: "light", interval: 30 });
  });

  it("reads a day state stored before floating days were tracked by id", async () => {
    const app = await boot({
      program: catalogPushPull,
      dayState: { date: dateKey(nov(16)), floatingIndex: 1 },
    });
    expect(app.plan().dayName).toBe("Pull");
    expect(app.get().loadProblems).toEqual([]);
  });

  it("brings the OS in line with the stored autostart and translucency settings", async () => {
    const app = await boot({ settings: { ...DEFAULT_SETTINGS, glass: true, opacity: 0.5 } });
    expect(app.client.setGlass).toHaveBeenCalledWith(true);
    expect(app.client.setAutostart).toHaveBeenCalledWith(true);
  });

  it("clears a translucent window at boot when the setting is off", async () => {
    const app = await boot({ settings: { ...DEFAULT_SETTINGS, glass: false } });
    expect(app.client.setGlass).toHaveBeenCalledWith(false);
  });

  it("learns what the computer supports", async () => {
    const app = await boot();
    await vi.waitFor(() =>
      expect(app.get().capabilities).toEqual({ tray: true, glass: true, idle: true }),
    );
  });

  it("follows the clock on whether its idle time is still the system's own", async () => {
    const app = await boot();
    await vi.waitFor(() => expect(app.get().capabilities.idle).toBe(true));
    const before = app.get().capabilities;
    app.get().tick(0, true);
    expect(app.get().capabilities).toBe(before);
    // The idle backend was lost: from now on the reading is the window's own.
    app.get().tick(0, false);
    expect(app.get().capabilities).toEqual({ tray: true, glass: true, idle: false });
    app.get().tick(0, true);
    expect(app.get().capabilities.idle).toBe(true);
  });

  it("is not booted until what is stored has been read", async () => {
    const backend = fakeBackend({ program: catalogPushPull });
    const store = createNabdStore({ client: backend.client, now: () => nov(16), newId: () => "x" });
    expect(store.getState().booted).toBe(false);
    const hydrating = store.getState().hydrate();
    expect(store.getState().booted).toBe(false);
    await hydrating;
    expect(store.getState()).toMatchObject({ booted: true, program: catalogPushPull });
  });

  it("puts a stored plan that breaks the rules right, and saves it so", async () => {
    const plank = { ...catalogBenchRow, id: "plank-row", exId: CATALOG.plank };
    const stored: Program = {
      ...catalogPushPull,
      days: [{ ...catalogPushPull.days[0]!, exercises: [catalogBenchRow, plank] }],
    };
    const app = await boot({ program: stored });
    const [, fixed] = app.get().program.days[0]!.exercises;
    expect(fixed).toMatchObject({
      repMode: "time",
      sets: [{ amount: 45 }, { amount: 45 }, { amount: 45 }],
    });
    expect(app.get().loadProblems).toEqual([]);
    expect(app.data.program).toEqual(app.get().program);
    // A plan that was already in order is not written again.
    const untouched = await boot();
    expect(untouched.savedKeys()).not.toContain("program");
  });
});

describe("booting on data an older version stored", () => {
  it("reads prescribed sets under their old field names, and writes the plan back in today's", async () => {
    const oldSets = [1, 2, 3].map(() => ({ type: "working", a: 8, b: 12, val: 8 }));
    const stored = {
      ...catalogPushPull,
      days: catalogPushPull.days.map((day) => ({
        ...day,
        exercises: day.exercises.map((row) => ({ ...row, intensity: "rpe", sets: oldSets })),
      })),
    };
    const app = await boot({ program: stored });

    expect(app.get().loadProblems).toEqual([]);
    expect(app.get().program.days[0]!.exercises[0]!.sets[0]).toEqual({
      type: "working",
      amount: 8,
      upTo: 12,
      intensity: 8,
    });
    expect(app.savedKeys()).toContain("program");
    expect(app.data.program).toEqual(app.get().program);
  });

  it("gives an exercise the catalog has retired to the one that replaced it", async () => {
    const retired = { ...catalogBenchRow, id: "one-arm-row", exId: `${CATALOG.row}__uni` };
    const stored: Program = {
      ...catalogPushPull,
      days: [{ ...catalogPushPull.days[0]!, exercises: [retired] }],
    };
    const app = await boot({ program: stored });

    expect(app.get().program.days[0]!.exercises[0]!.exId).toBe(CATALOG.row);
    expect(app.plan().items.map((item) => item.exercise.id)).toEqual([CATALOG.row]);
    expect(app.data.program).toEqual(app.get().program);
  });

  it("reads a rotation stored as positions in the pools, and writes it back as exercises", async () => {
    const cycled: Program = {
      ...catalogPushPull,
      type: "cycled",
      days: [
        {
          ...catalogPushPull.days[0]!,
          slots: [
            {
              ...catalogBenchRow,
              id: "chest",
              muscle: "chest",
              pool: [CATALOG.bench, CATALOG.fly],
            },
          ],
        },
      ],
    };
    const app = await boot({ program: cycled, rotationState: { chest: 3 } });
    expect(app.get().loadProblems).toEqual([]);
    expect(app.plan().items[0]!.exercise.id).toBe(CATALOG.fly);
    expect(app.data.rotationState).toEqual({ chest: CATALOG.fly });
  });
});
