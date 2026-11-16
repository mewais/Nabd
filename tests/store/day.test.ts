import type { Program } from "@nabd/domain";
import { DEFAULT_SETTINGS, dateKey, freshDayState } from "@nabd/domain";
import { createNabdStore, selectStats, selectTodayPlan } from "@nabd/store";
import { nov } from "../support/domain-factories";
import { CATALOG } from "../support/catalog";
import { BENCH, FLY, ROW, benchRow, boot, fakeBackend, flyRow, program } from "./harness";

const { plank: PLANK } = CATALOG;

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
    const app = await boot({ program, dayState: { date: dateKey(nov(16)), floatingIndex: 1 } });
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
    const backend = fakeBackend({ program });
    const store = createNabdStore({ client: backend.client, now: () => nov(16), newId: () => "x" });
    expect(store.getState().booted).toBe(false);
    const hydrating = store.getState().hydrate();
    expect(store.getState().booted).toBe(false);
    await hydrating;
    expect(store.getState()).toMatchObject({ booted: true, program });
  });

  it("puts a stored plan that breaks the rules right, and saves it so", async () => {
    const plank = { ...benchRow, id: "plank-row", exId: PLANK };
    const stored: Program = {
      ...program,
      days: [{ ...program.days[0]!, exercises: [benchRow, plank] }],
    };
    const app = await boot({ program: stored });
    const [, fixed] = app.get().program.days[0]!.exercises;
    expect(fixed).toMatchObject({ repMode: "time", sets: [{ a: 45 }, { a: 45 }, { a: 45 }] });
    expect(app.get().loadProblems).toEqual([]);
    expect(app.data.program).toEqual(app.get().program);
    // A plan that was already in order is not written again.
    const untouched = await boot();
    expect(untouched.savedKeys()).not.toContain("program");
  });
});

describe("across restarts and days", () => {
  it("a restart restores exactly where the day stood", async () => {
    const first = await boot();
    await first.log(flyRow.id, 2);
    first.get().toggleSkip(benchRow.id);

    const second = await boot({}, { client: first.client, data: first.data });
    expect(second.plan().item(flyRow.id)!.done).toBe(2);
    expect(second.plan().item(benchRow.id)!.skipped).toBe(true);
    expect(second.plan().setsRemaining).toBe(1);
  });

  it("an unfinished floating day comes back tomorrow, with a record of today", async () => {
    const app = await boot();
    await app.log(benchRow.id, 2);
    app.get().toggleSkip(flyRow.id);
    app.advanceTo(nov(17, 9, 30));

    expect(app.plan().dayName).toBe("Push");
    expect(app.plan().setsDone).toBe(0);
    expect(app.get().dayState).toEqual(freshDayState(nov(17)));
    expect(app.get().dayLog).toEqual([{ date: dateKey(nov(16)), planned: 6, done: 2 }]);
    expect(app.get().session).toBeNull();
  });

  it("a completed floating day moves on to the next one", async () => {
    const app = await boot();
    await app.log(benchRow.id, 3);
    await app.log(flyRow.id, 3);
    app.advanceTo(nov(17, 9, 30));
    expect(app.plan().dayName).toBe("Pull");
    expect(app.data.dayState).toMatchObject({ dayId: "pull" });
  });

  it("cycled pools rotate after a day they were trained", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.setType("cycled"));
    const slot = app.get().program.days[0]!.slots[0]!;
    expect(slot.pool).toEqual([BENCH, FLY]);
    expect(app.plan().items[0]!.exercise.id).toBe(BENCH);

    await app.log(slot.id, 1);
    app.advanceTo(nov(17, 9, 30));
    expect(app.get().rotationState).toEqual({ [slot.id]: FLY });
    expect(app.plan().items[0]!.exercise.id).toBe(FLY);
  });

  it("editing a pool neither skips nor repeats an exercise", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.setType("cycled"));
    const slot = app.get().program.days[0]!.slots[0]!;
    app.get().editProgram((e) => e.addPoolExercise("push", slot.id, ROW));
    // The pool is Bench, Fly, Row. Bench is trained, then taken out of the pool.
    await app.log(slot.id, 1);
    app.get().editProgram((e) => e.removePoolExercise("push", slot.id, BENCH));
    app.advanceTo(nov(17, 9, 30));
    expect(app.plan().dayName).toBe("Push");
    expect(app.plan().items[0]!.exercise.id).toBe(FLY);

    // Fly is up next and is taken out before it is trained: Row follows, not Bench again.
    app.get().editProgram((e) => e.addPoolExercise("push", slot.id, BENCH));
    app.get().editProgram((e) => e.removePoolExercise("push", slot.id, FLY));
    expect(app.plan().items[0]!.exercise.id).toBe(ROW);

    // Row is trained, so Bench is up next — and still is after Row is taken out and put back.
    await app.log(slot.id, 1);
    app.advanceTo(nov(18, 9, 30));
    expect(app.data.rotationState).toEqual({ [slot.id]: BENCH });
    app.get().editProgram((e) => e.removePoolExercise("push", slot.id, ROW));
    app.get().editProgram((e) => e.addPoolExercise("push", slot.id, ROW));
    app.get().editProgram((e) => e.addPoolExercise("push", slot.id, FLY));
    expect(app.plan().items[0]!.exercise.id).toBe(BENCH);
    // Bench itself is taken out: the exercise after it in the pool takes its turn.
    app.get().editProgram((e) => e.removePoolExercise("push", slot.id, BENCH));
    expect(app.plan().items[0]!.exercise.id).toBe(ROW);
    expect(app.data.rotationState).toEqual({ [slot.id]: ROW });
  });

  it("reads a rotation stored as positions in the pools, and writes it back as exercises", async () => {
    const cycled: Program = {
      ...program,
      type: "cycled",
      days: [
        {
          ...program.days[0]!,
          slots: [{ ...benchRow, id: "chest", muscle: "chest", pool: [BENCH, FLY] }],
        },
      ],
    };
    const app = await boot({ program: cycled, rotationState: { chest: 3 } });
    expect(app.get().loadProblems).toEqual([]);
    expect(app.plan().items[0]!.exercise.id).toBe(FLY);
    expect(app.data.rotationState).toEqual({ chest: FLY });
  });

  it("a floating plan is not held up by a day that was skipped outright", async () => {
    const app = await boot();
    app.get().toggleSkip(benchRow.id);
    app.get().toggleSkip(flyRow.id);
    app.advanceTo(nov(17, 9, 30));
    expect(app.plan().dayName).toBe("Pull");
  });

  it("editing a floating plan does not change which day today is", async () => {
    const app = await boot();
    await app.log(benchRow.id, 3);
    await app.log(flyRow.id, 3);
    app.advanceTo(nov(17, 9, 30));
    expect(app.plan().dayName).toBe("Pull");

    app.get().editProgram((e) => e.addDay(null));
    app.get().editProgram((e) => e.moveDay("pull", -1));
    expect(app.plan().dayName).toBe("Pull");
    app.get().editProgram((e) => e.removeDay("push"));
    expect(app.plan().dayName).toBe("Pull");
    expect(app.data.dayState).toMatchObject({ dayId: "pull" });

    // Finishing Pull moves on to the day after it in the new order.
    await app.log(app.plan().items[0]!.id, 3);
    app.advanceTo(nov(18, 9, 30));
    expect(app.plan().dayName).toBe("New day");
  });

  it("removing today's floating day moves today to the day that took its place", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.removeDay("push"));
    expect(app.plan().dayName).toBe("Pull");
  });

  it("sets logged today still count after their exercise leaves the plan", async () => {
    const app = await boot();
    await app.log(benchRow.id, 2);
    app.get().editProgram((e) => e.removeExercise("push", benchRow.id));
    expect(app.plan().setsDone).toBe(2);
    expect(app.plan().items.at(-1)).toMatchObject({ isExtra: true, done: 2 });

    app.get().editProgram((e) => e.addExercise("push", BENCH));
    expect(app.plan().items.at(-1)).toMatchObject({ isExtra: false, done: 2, planned: 3 });
    expect(app.plan().items).toHaveLength(2);
  });

  it("sets logged today still count after the plan type is switched", async () => {
    const app = await boot();
    await app.log(flyRow.id, 2);
    app.get().editProgram((e) => e.setType("cycled"));
    expect(app.plan().setsDone).toBe(2);
    app.advanceTo(nov(17, 9, 30));
    expect(app.get().dayLog).toEqual([{ date: dateKey(nov(16)), planned: 3, done: 0 }]);
  });

  it("a set logged just after midnight belongs to the new day, plan item included", async () => {
    const app = await boot();
    app.get().openSession(benchRow.id);
    app.get().setReps(11);
    app.clock.now = nov(17, 0, 5);
    await app.get().logSet();

    const [set] = app.get().history;
    expect(app.get().dayState.date).toBe(dateKey(nov(17)));
    expect(set).toMatchObject({ date: dateKey(nov(17)), value: 11, planItemId: benchRow.id });
    expect(app.plan().item(benchRow.id)!.done).toBe(1);
    // Monday had no set: on a floating plan that is a day that waited, not one that was missed.
    expect(app.get().dayLog).toEqual([]);
  });

  it("an idle floating day is not on record, however long the app stays open", async () => {
    const app = await boot();
    for (const day of [17, 18, 19]) app.advanceTo(nov(day, 9, 30));
    expect(app.get().dayLog).toEqual([]);
    expect(selectStats(app.get()).completionThisWeek()).toBe(0);
    // Today counts from its first set, like the days before it.
    await app.log(benchRow.id, 3);
    expect(selectStats(app.get()).completionThisWeek()).toBe(50);
  });

  it("a clock that jumps back a day changes nothing: no day is closed, none reopened", async () => {
    const app = await boot();
    await app.log(benchRow.id, 3);
    await app.log(flyRow.id, 3);
    app.advanceTo(nov(17, 9, 30));
    expect(app.plan().dayName).toBe("Pull");
    const { dayLog, dayState } = app.get();
    vi.mocked(app.client.saveMany).mockClear();

    app.advanceTo(nov(16, 23, 30));
    expect(app.get().dayState).toBe(dayState);
    expect(app.get().dayLog).toBe(dayLog);
    expect(app.plan().dayName).toBe("Pull");
    expect(app.client.saveMany).not.toHaveBeenCalled();
    // The same holds at the next launch.
    const later = await boot({}, { client: app.client, data: app.data }, nov(16, 23, 45));
    expect(later.get().dayState.date).toBe(dateKey(nov(17)));
    expect(later.get().dayLog).toEqual(dayLog);
  });

  it("after midnight, a set of an exercise the new day does not plan is logged as an extra", async () => {
    const mondayOnly: Program = {
      ...program,
      schedule: "weekday",
      days: [{ ...program.days[0]!, weekday: 1 }],
    };
    const app = await boot({ program: mondayOnly });
    app.get().openSession(benchRow.id);
    app.clock.now = nov(17, 0, 5);
    await app.get().logSet();

    const [set] = app.get().history;
    const item = app.plan().item(set!.planItemId!)!;
    expect(set!.date).toBe(dateKey(nov(17)));
    expect(item).toMatchObject({ isExtra: true, done: 1 });
    expect(item.exercise.id).toBe(BENCH);
    expect(app.get().session!.itemId).toBe(item.id);
  });

  it("opening the logger after midnight opens it on the new day", async () => {
    const app = await boot();
    await app.log(benchRow.id, 3);
    await app.log(flyRow.id, 3);
    app.get().closeSession();
    app.clock.now = nov(17, 0, 5);
    app.get().openSession();
    expect(app.get().dayState.date).toBe(dateKey(nov(17)));
    expect(app.plan().item(app.get().session!.itemId)!.exercise.id).toBe(ROW);
  });

  it("planned weekdays the app was not running for are on record as missed", async () => {
    const weekdays: Program = {
      ...program,
      schedule: "weekday",
      days: [
        { ...program.days[0]!, weekday: 1 },
        { ...program.days[1]!, weekday: 3 },
      ],
    };
    const first = await boot({ program: weekdays });
    await first.log(benchRow.id, 2);
    const later = await boot({}, { client: first.client, data: first.data }, nov(24, 9));
    expect(later.get().dayLog).toEqual([
      { date: dateKey(nov(16)), planned: 6, done: 2 },
      { date: dateKey(nov(18)), planned: 3, done: 0 },
      { date: dateKey(nov(23)), planned: 6, done: 0 },
    ]);
  });

  it("extras and sets beyond the plan do not inflate completion", async () => {
    const app = await boot();
    // Five bench sets against three planned (the logger moves on, so reopen it each time).
    for (let i = 0; i < 5; i++) await app.log(benchRow.id, 1);
    app.get().openLibrary({ kind: "extra" });
    app.get().pickExercise(ROW);
    await app.get().logSet();
    expect(app.plan().setsDone).toBe(6);
    expect(selectStats(app.get()).completionThisWeek()).toBe(50);
  });

  it("rollover saves the day log, the day state and the rotation as one write", async () => {
    const app = await boot();
    await app.log(benchRow.id, 1);
    vi.mocked(app.client.save).mockClear();
    app.advanceTo(nov(17, 9, 30));
    expect(app.savedKeys()).toEqual([]);
    expect(app.client.saveMany).toHaveBeenCalledTimes(1);
    const [written] = vi.mocked(app.client.saveMany).mock.calls[0]!;
    expect(Object.keys(written).sort()).toEqual(["dayLog", "dayState", "rotationState"]);
    expect(written.dayState?.date).toBe("2026-11-17");
  });

  it("the day rolls over on boot too, if the app was closed overnight", async () => {
    const first = await boot();
    await first.log(benchRow.id, 3);
    await first.log(flyRow.id, 3);
    const backend = { client: first.client, data: first.data };
    const clockLater = createNabdStore({
      client: backend.client,
      now: () => nov(18, 8),
      newId: () => "x",
    });
    await clockLater.getState().hydrate();
    expect(selectTodayPlan(clockLater.getState()).dayName).toBe("Pull");
  });
});
