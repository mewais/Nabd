import type { LoggedSet, Program } from "@nabd/domain";
import { DEFAULT_SETTINGS, dateKey, freshDayState } from "@nabd/domain";
import type { BootSnapshot, IpcClient, Singletons } from "@nabd/ipc-client";
import {
  createNabdStore,
  selectCoach,
  selectCoverage,
  selectLibrary,
  selectNudgeStatus,
  selectPendingNudge,
  selectStats,
  selectTodayPlan,
} from "@nabd/store";
import { nov, row, working } from "../support/domain-factories";

const BENCH = "bench_press__barbell";
const FLY = "fly__dumbbell";
const ROW = "row__barbell";
const threeSets = [working(8, 12), working(8, 12), working(8, 12)];
const benchRow = row(BENCH, threeSets);
const flyRow = row(FLY, threeSets);

/** Floating two-day plan: Push (bench, fly) then Pull (row). */
const program: Program = {
  name: "Test plan",
  type: "fixed",
  schedule: "floating",
  days: [
    { id: "push", name: "Push", weekday: null, exercises: [benchRow, flyRow], slots: [] },
    { id: "pull", name: "Pull", weekday: null, exercises: [row(ROW, threeSets)], slots: [] },
  ],
};

/** An in-memory backend that behaves like the real one, plus spies on the native calls. */
function fakeBackend(initial: Partial<BootSnapshot> = {}) {
  const data: BootSnapshot = {
    program: null,
    settings: null,
    customExercises: null,
    rotationState: null,
    dayState: null,
    dayLog: null,
    history: [],
    ...initial,
  };
  const client: IpcClient = {
    loadAll: async () => structuredClone(data),
    save: vi.fn(async (key: keyof Singletons, value: unknown) => {
      data[key] = structuredClone(value);
    }),
    appendSet: vi.fn(async (set) => {
      data.history.push(set);
    }),
    deleteSet: vi.fn(async (id) => {
      data.history = data.history.filter((s) => (s as LoggedSet).id !== id);
    }),
    exportData: vi.fn(async () => "/downloads/nabd-data.json"),
    importData: vi.fn(async (imported) => {
      Object.assign(data, imported);
    }),
    notify: vi.fn(async () => {}),
    platformCapabilities: async () => ({ tray: true, glass: true, idle: true }),
    sendTestNotification: vi.fn(async () => {}),
    setGlass: vi.fn(async () => {}),
    setVibrancy: vi.fn(async () => {}),
    setAutostart: vi.fn(async () => {}),
    updateTray: vi.fn(async () => {}),
    quit: vi.fn(async () => {}),
    onTick: async () => () => {},
    onTrayAction: async () => () => {},
  };
  return { client, data };
}

/** A booted store on Monday 16 Nov 2026 (10:00 unless told otherwise), with a clock the test controls. */
async function boot(
  initial: Partial<BootSnapshot> = { program },
  backend = fakeBackend(initial),
  startAt = nov(16, 10),
) {
  const clock = { now: startAt };
  let id = 0;
  const store = createNabdStore({
    client: backend.client,
    now: () => clock.now,
    newId: () => `id${++id}`,
  });
  await store.getState().hydrate();
  const get = store.getState;
  return {
    ...backend,
    store,
    get,
    clock,
    plan: () => selectTodayPlan(get()),
    /** Move the clock and let the app notice. */
    advanceTo: (date: Date, idleSeconds = 0) => {
      clock.now = date;
      get().tick(idleSeconds);
    },
    /** The keys written to the backend, in order. */
    savedKeys: () => vi.mocked(backend.client.save).mock.calls.map(([key]) => key),
    /** Open the logger on an item and log `count` sets as they stand. */
    log: async (itemId: string, count: number) => {
      get().openSession(itemId);
      for (let i = 0; i < count; i++) await get().logSet();
    },
  };
}

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
    expect(app.client.setVibrancy).toHaveBeenCalledWith(0.5);
    expect(app.client.setAutostart).toHaveBeenCalledWith(true);
  });
});

describe("stored data that cannot be read", () => {
  const goodSet = (id: string): LoggedSet => ({
    id,
    exId: BENCH,
    exercise: "Barbell Bench Press",
    group: "Chest",
    muscles: ["chest"],
    value: 8,
    weight: 40,
    ts: nov(16, 9, 30).toISOString(),
    date: dateKey(nov(16)),
    trigger: "manual",
    planItemId: benchRow.id,
    setType: "working",
  });

  it("an unreadable value runs on a default, is reported, and is never saved over", async () => {
    const stored = { nonsense: true };
    const app = await boot({ program: stored, settings: "??" });
    expect(app.get().program.days).toEqual([]);
    expect(app.get().settings).toEqual(DEFAULT_SETTINGS);
    expect(app.get().loadProblems.map((p) => p.source)).toEqual(["settings", "program"]);
    expect(app.get().appNotice).toMatchObject({ kind: "error" });
    expect(app.get().appNotice!.text).toContain("your plan");

    app.get().editProgram((e) => e.addDay(1));
    app.get().updateSettings({ interval: 30 });
    expect(app.get().program.days).toHaveLength(1);
    expect(app.data.program).toEqual(stored);
    expect(app.data.settings).toBe("??");
    expect(app.savedKeys()).not.toContain("program");
    expect(app.savedKeys()).not.toContain("settings");
  });

  it("what could be read keeps saving as usual", async () => {
    const app = await boot({ program, settings: "??" });
    app.get().editProgram((e) => e.rename("Renamed"));
    expect((app.data.program as Program).name).toBe("Renamed");
  });

  it("one bad history row is left out without losing the others", async () => {
    const app = await boot({ program, history: [goodSet("a"), { id: 1 }, goodSet("b")] });
    expect(app.get().history.map((set) => set.id)).toEqual(["a", "b"]);
    expect(app.plan().item(benchRow.id)!.done).toBe(2);
    expect(app.get().loadProblems).toEqual([{ source: "history", detail: "1 set left out" }]);

    await app.log(benchRow.id, 1);
    expect(app.client.appendSet).toHaveBeenCalledTimes(1);
  });

  it("a load that fails outright is reported, and nothing is saved over the unread data", async () => {
    const backend = fakeBackend({ program });
    backend.client.loadAll = async () => Promise.reject(new Error("database is locked"));
    const app = await boot({}, backend);
    expect(app.get().booted).toBe(true);
    expect(app.get().loadProblems).toEqual([
      { source: "everything", detail: "database is locked" },
    ]);
    expect(app.get().appNotice!.text).toContain("database is locked");

    app.get().editProgram((e) => e.addDay(1));
    app.get().togglePause();
    app.advanceTo(nov(17, 9));
    expect(app.client.save).not.toHaveBeenCalled();
    expect(app.data.program).toEqual(program);
  });

  it("importing a backup replaces the unreadable data and lifts the block", async () => {
    const app = await boot({ program: { nonsense: true } });
    await app.get().importData(JSON.stringify({ app: "Nabd", version: 2, program }));
    expect(app.get().loadProblems).toEqual([]);
    expect(app.get().appNotice).toBeNull();
    app.get().editProgram((e) => e.rename("Recovered"));
    expect((app.data.program as Program).name).toBe("Recovered");
  });

  it("fresh installs have nothing to report", async () => {
    const app = await boot({});
    expect(app.get().loadProblems).toEqual([]);
    expect(app.get().appNotice).toBeNull();
  });
});

describe("failed saves", () => {
  it("a singleton that cannot be saved is reported app-wide", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.rename("Saved"));
    vi.mocked(app.client.save).mockRejectedValueOnce(new Error("disk full"));
    app.get().editProgram((e) => e.rename("Unsaved"));
    await Promise.resolve();
    await Promise.resolve();
    expect(app.get().appNotice).toEqual({
      kind: "error",
      text: "Could not save your plan: disk full",
    });
  });

  it("the notice outlives the Settings dialog and goes when dismissed", async () => {
    const app = await boot();
    vi.mocked(app.client.appendSet).mockRejectedValueOnce(new Error("disk full"));
    await app.log(benchRow.id, 1);
    app.get().setSettingsOpen(true);
    app.get().setSettingsOpen(false);
    expect(app.get().appNotice).not.toBeNull();
    app.get().dismissNotice();
    expect(app.get().appNotice).toBeNull();
  });

  it("an undo that fails leaves the set where it was, and says so", async () => {
    const app = await boot();
    await app.log(benchRow.id, 1);
    vi.mocked(app.client.deleteSet).mockRejectedValueOnce(new Error("busy"));
    await app.get().undoSet(app.get().history[0]!.id);
    expect(app.get().history).toHaveLength(1);
    expect(app.get().appNotice).toEqual({ kind: "error", text: "Could not undo that set: busy" });
  });

  it("an OS call that fails is reported too, never thrown", async () => {
    const app = await boot();
    vi.mocked(app.client.setAutostart).mockRejectedValueOnce(new Error("not permitted"));
    app.get().updateSettings({ openAtStartup: false });
    await Promise.resolve();
    await Promise.resolve();
    expect(app.get().appNotice!.text).toBe("Could not change start at login: not permitted");
  });
});

describe("the plan drives today", () => {
  it("shows the floating day's exercises", async () => {
    const app = await boot();
    expect(app.plan().dayName).toBe("Push");
    expect(app.plan().items.map((i) => i.exercise.id)).toEqual([BENCH, FLY]);
  });

  it("plan edits reach today immediately and are saved", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.addExercise("push", ROW));
    app.get().editProgram((e) => e.addSet("push", { kind: "ex", id: benchRow.id }));
    expect(app.plan().items.map((i) => i.exercise.id)).toEqual([BENCH, FLY, ROW]);
    expect(app.plan().item(benchRow.id)!.planned).toBe(4);
    expect((app.data.program as Program).days[0]!.exercises).toHaveLength(3);
  });

  it("custom exercises can be created from a draft, used, and deleted everywhere", async () => {
    const app = await boot();
    app.get().openLibrary({ kind: "exercise", dayId: "push" });
    app.get().startDraft(BENCH);
    expect(app.get().library.draft).toMatchObject({
      name: "Barbell Bench Press (copy)",
      primary: ["chest"],
    });
    app.get().patchDraft({ name: "  Floor Press ", secondary: ["chest", "triceps"] });
    app.get().saveDraft();

    const [custom] = app.get().customExercises;
    expect(custom).toMatchObject({
      name: "Floor Press",
      group: "Chest",
      custom: true,
      secondary: ["triceps"],
    });
    expect(app.get().library.draft).toBeNull();

    app.get().pickExercise(custom!.id);
    expect(app.get().library.target).toBeNull();
    expect(app.plan().items.at(-1)!.exercise.name).toBe("Floor Press");

    app.get().deleteCustomExercise(custom!.id);
    expect(app.get().customExercises).toEqual([]);
    expect(app.plan().items.map((i) => i.exercise.id)).toEqual([BENCH, FLY]);
    expect(app.data.customExercises).toEqual([]);
  });

  it("a draft without a name or primary muscle is not saved", async () => {
    const app = await boot();
    app.get().startDraft();
    app.get().patchDraft({ name: "Nameless muscle" });
    app.get().saveDraft();
    app.get().patchDraft({ name: " ", primary: ["chest"] });
    app.get().saveDraft();
    expect(app.get().customExercises).toEqual([]);
  });

  it("picking into a cycled pool keeps the library open for more", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.setType("cycled"));
    const slot = app.get().program.days[0]!.slots[0]!;
    app.get().openLibrary({ kind: "pool", dayId: "push", slotId: slot.id, muscle: slot.muscle });
    app.get().pickExercise(ROW);
    expect(app.get().program.days[0]!.slots[0]!.pool).toContain(ROW);
    expect(app.get().library.target).not.toBeNull();
  });
});

describe("logging sets", () => {
  it("logs one set at a time against the plan item and saves it", async () => {
    const app = await boot();
    app.get().openSession();
    expect(app.get().session).toMatchObject({
      itemId: benchRow.id,
      reps: 8,
      weight: 0,
      trigger: "manual",
    });
    app.get().setReps(10);
    app.get().setWeight(40);
    await app.get().logSet();

    expect(app.get().history).toEqual([
      expect.objectContaining({
        exId: BENCH,
        exercise: "Barbell Bench Press",
        value: 10,
        weight: 40,
        date: dateKey(nov(16)),
        trigger: "manual",
        planItemId: benchRow.id,
        setType: "working",
      }),
    ]);
    expect(app.client.appendSet).toHaveBeenCalledTimes(1);
    expect(app.plan().item(benchRow.id)!.done).toBe(1);
    expect(app.plan().setsRemaining).toBe(5);
  });

  it("stays on the exercise, rests, then moves on when it is finished", async () => {
    const app = await boot();
    await app.log(benchRow.id, 1);
    expect(app.get().session!.itemId).toBe(benchRow.id);
    expect(app.get().session!.restRemaining(app.clock.now)).toBe(90);
    await app.get().logSet();
    await app.get().logSet();
    expect(app.get().session!.itemId).toBe(flyRow.id);
  });

  it("keeps the session open on the last exercise when the day is finished", async () => {
    const app = await boot();
    await app.log(benchRow.id, 3);
    await app.log(flyRow.id, 3);
    expect(app.plan().isComplete).toBe(true);
    expect(app.get().session!.itemId).toBe(flyRow.id);
  });

  it("weights are entered in the display unit and stepped by the user's increment", async () => {
    const app = await boot({ program, settings: { ...DEFAULT_SETTINGS, weightUnit: "lb" } });
    app.get().openSession();
    app.get().setWeight(25);
    app.get().stepWeight(1);
    app.get().stepReps(1);
    await app.get().logSet();
    const [set] = app.get().history;
    expect(set!.value).toBe(9);
    expect(set!.weight! * 2.2046226218).toBeCloseTo(27.5, 2);
  });

  it("applies the coach's suggestion on request", async () => {
    const lastWeek: LoggedSet = {
      id: "old",
      exId: BENCH,
      exercise: "Barbell Bench Press",
      group: "Chest",
      muscles: ["chest"],
      value: 8,
      weight: 40,
      ts: nov(9, 10).toISOString(),
      date: dateKey(nov(9)),
      trigger: "manual",
      planItemId: null,
      setType: "working",
    };
    const app = await boot({ program, history: [lastWeek] });
    app.get().openSession();
    expect(app.get().session).toMatchObject({ reps: 8, weight: 40 });
    expect(selectCoach(app.get()).adviceFor(app.plan().nextItem!)?.kind).toBe("add_reps");
    app.get().applyAdvice("primary");
    expect(app.get().session).toMatchObject({ reps: 9, weight: 40 });
    app.get().applyAdvice("alternative");
    expect(app.get().session).toMatchObject({ reps: 8, weight: 42.5 });
  });

  it("undo removes the set everywhere", async () => {
    const app = await boot();
    await app.log(benchRow.id, 2);
    await app.get().undoSet(app.get().history[0]!.id);
    expect(app.plan().item(benchRow.id)!.done).toBe(1);
    expect(app.data.history).toHaveLength(1);
  });

  it("a failed save keeps the set on screen and tells the user", async () => {
    const app = await boot();
    vi.mocked(app.client.appendSet).mockRejectedValueOnce(new Error("disk full"));
    await app.log(benchRow.id, 1);
    expect(app.get().history).toHaveLength(1);
    expect(app.get().appNotice).toEqual({
      kind: "error",
      text: "Could not save that set: disk full",
    });
  });

  it("the form can switch exercises freely and close", async () => {
    const app = await boot();
    app.get().openSession();
    app.get().focusItem(flyRow.id);
    expect(app.get().session!.itemId).toBe(flyRow.id);
    app.get().focusItem("unknown");
    expect(app.get().session!.itemId).toBe(flyRow.id);
    app.get().closeSession();
    expect(app.get().session).toBeNull();
    await app.get().logSet();
    expect(app.get().history).toEqual([]);
  });
});

describe("skipping and extras", () => {
  it("a skipped exercise is passed over and can be restored", async () => {
    const app = await boot();
    app.get().toggleSkip(benchRow.id);
    expect(app.plan().nextItem!.id).toBe(flyRow.id);
    expect(app.plan().setsPlanned).toBe(3);
    app.get().toggleSkip(benchRow.id);
    expect(app.plan().nextItem!.id).toBe(benchRow.id);
  });

  it("an exercise outside the plan can be logged today; untouched, it can be removed", async () => {
    const app = await boot();
    app.get().openLibrary({ kind: "extra" });
    app.get().pickExercise(ROW);
    const extra = app.plan().items.at(-1)!;
    expect(extra.isExtra).toBe(true);
    expect(app.get().session!.itemId).toBe(extra.id);
    expect(app.get().library.target).toBeNull();

    app.get().toggleSkip(extra.id);
    expect(app.plan().items).toHaveLength(2);

    app.get().pickExercise(ROW); // library is closed: nothing happens
    expect(app.plan().items).toHaveLength(2);
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
    expect(app.get().rotationState).toEqual({ [slot.id]: 1 });
    expect(app.plan().items[0]!.exercise.id).toBe(FLY);
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
    expect(app.get().dayLog).toEqual([{ date: dateKey(nov(16)), planned: 6, done: 0 }]);
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

  it("rollover saves the day log, then the day state, then the rotation", async () => {
    const app = await boot();
    await app.log(benchRow.id, 1);
    vi.mocked(app.client.save).mockClear();
    app.advanceTo(nov(17, 9, 30));
    expect(app.savedKeys()).toEqual(["dayLog", "dayState", "rotationState"]);
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

describe("nudging", () => {
  // Workday 09:00–18:00, timer 50 min, minimum gap 15 min, idle after 30 s.
  const bootAt = (hour: number, minute = 0, initial: Partial<BootSnapshot> = { program }) =>
    boot(initial, fakeBackend(initial), nov(16, hour, minute));

  it("is quiet before work, counts down, nudges on the timer, and resets after a set", async () => {
    const app = await bootAt(8);
    expect(selectNudgeStatus(app.get()).state).toBe("off_hours");
    app.advanceTo(nov(16, 9, 30));
    expect(selectNudgeStatus(app.get())).toMatchObject({ state: "waiting", at: nov(16, 9, 50) });
    app.advanceTo(nov(16, 9, 50));
    expect(selectNudgeStatus(app.get())).toEqual({ state: "due", reason: "timer" });
    await app.log(benchRow.id, 1);
    expect(selectNudgeStatus(app.get())).toMatchObject({ state: "waiting", at: nov(16, 10, 40) });
  });

  it("launching mid-day does not owe a nudge for the hours before", async () => {
    const app = await bootAt(14);
    expect(selectNudgeStatus(app.get())).toMatchObject({ state: "waiting", at: nov(16, 14, 50) });
    app.advanceTo(nov(16, 14, 10), 600);
    expect(selectPendingNudge(app.get())).toBeNull();
    app.advanceTo(nov(16, 14, 50));
    expect(selectNudgeStatus(app.get())).toEqual({ state: "due", reason: "timer" });
  });

  it("building a plan mid-day starts the count from then", async () => {
    const app = await bootAt(9, 0, {});
    app.advanceTo(nov(16, 15));
    expect(selectNudgeStatus(app.get()).state).toBe("nothing_left");
    app.get().editProgram((e) => e.addDay(1));
    app.get().editProgram((e) => e.addExercise(app.get().program.days[0]!.id, BENCH));
    app.advanceTo(nov(16, 15, 1));
    expect(selectNudgeStatus(app.get())).toMatchObject({ state: "waiting", at: nov(16, 15, 51) });
  });

  it("an idle moment nudges early once the minimum gap has passed", async () => {
    const app = await bootAt(9);
    app.advanceTo(nov(16, 9, 5), 300);
    expect(selectNudgeStatus(app.get()).state).toBe("waiting");
    app.advanceTo(nov(16, 9, 20), 45);
    expect(selectNudgeStatus(app.get())).toEqual({ state: "due", reason: "idle" });
  });

  it("an idle nudge stays put when the user reaches for the mouse, and is recorded as idle", async () => {
    const app = await bootAt(9);
    app.advanceTo(nov(16, 9, 20), 45);
    const fired = selectPendingNudge(app.get());
    expect(fired).toEqual({ reason: "idle", since: nov(16, 9, 20) });

    app.advanceTo(nov(16, 9, 21), 0);
    expect(selectNudgeStatus(app.get())).toEqual({ state: "due", reason: "idle" });
    expect(selectPendingNudge(app.get())).toBe(fired);

    app.get().openSession();
    expect(selectPendingNudge(app.get())).toBeNull();
    await app.get().logSet();
    expect(app.get().history[0]!.trigger).toBe("idle");
  });

  it("starting any exercise from the Today screen answers the pending nudge too", async () => {
    const app = await bootAt(9);
    app.advanceTo(nov(16, 9, 50));
    app.get().openSession(flyRow.id);
    await app.get().logSet();
    expect(app.get().history[0]).toMatchObject({ exId: FLY, trigger: "timer" });
  });

  it("a session opened with no nudge pending is manual", async () => {
    const app = await bootAt(9);
    app.advanceTo(nov(16, 9, 30));
    await app.log(benchRow.id, 1);
    expect(app.get().history[0]!.trigger).toBe("manual");
  });

  it("each nudge is a new pending object; the same nudge never is", async () => {
    const app = await bootAt(9);
    app.advanceTo(nov(16, 9, 50));
    const first = selectPendingNudge(app.get());
    app.advanceTo(nov(16, 9, 51));
    expect(selectPendingNudge(app.get())).toBe(first);

    app.get().snooze();
    expect(selectPendingNudge(app.get())).toBeNull();
    expect(selectNudgeStatus(app.get())).toMatchObject({ state: "waiting", at: nov(16, 9, 56) });
    app.advanceTo(nov(16, 9, 56));
    const second = selectPendingNudge(app.get());
    expect(second).toEqual({ reason: "timer", since: nov(16, 9, 56) });
    expect(second).not.toBe(first);
  });

  it("closing the logger without logging does not bring the nudge straight back", async () => {
    const app = await bootAt(9);
    app.advanceTo(nov(16, 9, 50));
    app.get().openSession();
    app.get().closeSession();
    app.advanceTo(nov(16, 9, 51));
    expect(selectPendingNudge(app.get())).toBeNull();
    app.advanceTo(nov(16, 9, 55));
    expect(selectPendingNudge(app.get())).toMatchObject({ reason: "timer" });
  });

  it("nothing fires over an open logger", async () => {
    const app = await bootAt(9);
    app.get().openSession();
    app.advanceTo(nov(16, 9, 50));
    expect(selectPendingNudge(app.get())).toBeNull();
    expect(app.get().session!.trigger).toBe("manual");
  });

  it("pausing, logging and the end of the workday withdraw a pending nudge", async () => {
    const paused = await bootAt(9);
    paused.advanceTo(nov(16, 9, 50));
    paused.get().togglePause();
    expect(selectPendingNudge(paused.get())).toBeNull();
    expect(selectNudgeStatus(paused.get()).state).toBe("paused");

    const evening = await bootAt(9);
    evening.advanceTo(nov(16, 17, 59));
    expect(selectPendingNudge(evening.get())).not.toBeNull();
    evening.advanceTo(nov(16, 18));
    expect(selectPendingNudge(evening.get())).toBeNull();
    expect(selectNudgeStatus(evening.get()).state).toBe("off_hours");

    const overnight = await bootAt(9);
    overnight.advanceTo(nov(16, 9, 50));
    overnight.clock.now = nov(17, 0, 1);
    overnight.get().tick(0);
    expect(selectPendingNudge(overnight.get())).toBeNull();
  });

  it("snooze and pause silence it", async () => {
    const app = await bootAt(9, 50);
    app.get().snooze();
    expect(selectNudgeStatus(app.get())).toMatchObject({ state: "waiting", at: nov(16, 10, 40) });
    app.get().togglePause();
    expect(selectNudgeStatus(app.get()).state).toBe("paused");
    app.get().togglePause();
    app.advanceTo(nov(16, 10, 40));
    expect(selectNudgeStatus(app.get()).state).toBe("due");
  });

  it("has nothing to nudge about once the day is done", async () => {
    const app = await boot();
    await app.log(benchRow.id, 3);
    await app.log(flyRow.id, 3);
    expect(selectNudgeStatus(app.get()).state).toBe("nothing_left");
  });

  it("a pause survives a restart on the same day and ends with the day", async () => {
    const first = await boot();
    first.get().togglePause();
    expect(first.data.dayState).toMatchObject({ paused: true });

    const sameDay = await boot({}, { client: first.client, data: first.data });
    expect(sameDay.get().paused).toBe(true);
    expect(selectNudgeStatus(sameDay.get()).state).toBe("paused");

    sameDay.advanceTo(nov(17, 9, 30));
    expect(sameDay.get().paused).toBe(false);
    expect(sameDay.data.dayState).toMatchObject({ paused: false });
  });
});

describe("settings and data", () => {
  it("applies valid changes, saves them, and ignores out-of-range ones", async () => {
    const app = await boot();
    app.get().updateSettings({ interval: 30, weightUnit: "lb" });
    expect(app.data.settings).toMatchObject({ interval: 30, weightUnit: "lb" });
    app.get().updateSettings({ interval: 0 });
    app.get().updateSettings({ workStart: 20 * 60 });
    expect(app.get().settings).toMatchObject({ interval: 30, workStart: 9 * 60 });
  });

  it("tells the OS about autostart and translucency changes only", async () => {
    const app = await boot();
    vi.mocked(app.client.setAutostart).mockClear();
    app.get().updateSettings({ interval: 30 });
    expect(app.client.setAutostart).not.toHaveBeenCalled();
    app.get().updateSettings({ openAtStartup: false });
    expect(app.client.setAutostart).toHaveBeenCalledWith(false);
    app.get().updateSettings({ glass: true });
    app.get().updateSettings({ opacity: 0.4 });
    expect(vi.mocked(app.client.setVibrancy).mock.calls).toEqual([[0.7], [0.4]]);
  });

  it("export reports where the file went, or why it failed", async () => {
    const app = await boot();
    await app.get().exportData();
    expect(app.get().notice).toEqual({
      kind: "info",
      text: "Exported to /downloads/nabd-data.json",
    });
    vi.mocked(app.client.exportData).mockRejectedValueOnce(new Error("read-only"));
    await app.get().exportData();
    expect(app.get().notice).toEqual({ kind: "error", text: "Export failed: read-only" });
  });

  it("import validates first, then reloads everything", async () => {
    const app = await boot();
    await app.get().importData("{not json");
    expect(app.get().notice?.kind).toBe("error");
    expect(app.client.importData).not.toHaveBeenCalled();

    const imported = { ...program, name: "Imported plan" };
    await app.get().importData(JSON.stringify({ app: "Nabd", version: 2, program: imported }));
    expect(app.get().program.name).toBe("Imported plan");
    expect(app.get().notice).toEqual({ kind: "info", text: "Import complete." });
  });

  it("an import only changes the settings its file contains", async () => {
    const app = await boot();
    app.get().updateSettings({ weightUnit: "lb", weightIncrement: 5 });
    const file = { app: "Nabd", version: 2, settings: { interval: 30 } };
    await app.get().importData(JSON.stringify(file));
    expect(app.get().settings).toEqual({
      ...DEFAULT_SETTINGS,
      weightUnit: "lb",
      weightIncrement: 5,
      interval: 30,
    });
    expect(app.data.settings).toEqual(app.get().settings);
  });

  it("an import from a newer version of the app is refused", async () => {
    const app = await boot();
    await app.get().importData(JSON.stringify({ app: "Nabd", version: 3, program }));
    expect(app.get().notice).toMatchObject({ kind: "error" });
    expect(app.get().notice!.text).toContain("newer version");
    expect(app.client.importData).not.toHaveBeenCalled();
  });

  it("opening or closing settings clears the last notice", async () => {
    const app = await boot();
    await app.get().exportData();
    app.get().setSettingsOpen(false);
    expect(app.get().notice).toBeNull();
  });
});

describe("derived data", () => {
  it("coverage, stats and the library follow the state", async () => {
    const app = await boot();
    expect(selectCoverage(app.get()).chest).toBe(0);
    await app.log(benchRow.id, 2);
    expect(selectCoverage(app.get()).chest).toBe(12.5);
    expect(selectStats(app.get()).setsThisWeek()).toBe(2);
    expect(selectStats(app.get()).completionThisWeek()).toBe(33);
    expect(selectLibrary(app.get()).byId(BENCH)?.name).toBe("Barbell Bench Press");
  });

  it("selectors return the same object until their inputs change", async () => {
    const app = await boot();
    const before = selectTodayPlan(app.get());
    app.get().setScreen("progress");
    app.get().setMapView("front");
    app.get().setMapStyle("outline");
    app.get().setProgressTab("weekly");
    app.get().setChartExercise(BENCH);
    app.get().selectPlanDay("pull");
    expect(selectTodayPlan(app.get())).toBe(before);
    expect(app.get()).toMatchObject({
      screen: "progress",
      planEditDay: "pull",
      chartExercise: BENCH,
    });
    await app.log(benchRow.id, 1);
    expect(selectTodayPlan(app.get())).not.toBe(before);
  });
});
