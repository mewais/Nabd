import type { Program } from "@nabd/domain";
import { dateKey, freshDayState } from "@nabd/domain";
import { createNabdStore, selectStats, selectTodayPlan } from "@nabd/store";
import { carry, nov, visit } from "../support/builders";
import { CATALOG } from "../support/exercises";
import { catalogBenchRow, catalogFlyRow, catalogPushPull } from "../support/programs";
import { boot } from "./fixtures";

describe("across restarts and days", () => {
  it("a restart restores exactly where the day stood", async () => {
    const first = await boot();
    await first.log(catalogFlyRow.id, 2);
    first.get().toggleSkip(catalogBenchRow.id);

    const second = await boot({}, { client: first.client, data: first.data });
    expect(second.plan().item(catalogFlyRow.id)!.done).toBe(2);
    expect(second.plan().item(catalogBenchRow.id)!.skipped).toBe(true);
    expect(second.plan().setsRemaining).toBe(1);
  });

  it("an unfinished floating day comes back tomorrow with only the rest, and a record of today", async () => {
    const app = await boot();
    await app.log(catalogBenchRow.id, 2);
    app.get().toggleSkip(catalogFlyRow.id);
    app.advanceTo(nov(17, 9, 30));

    expect(app.plan().dayName).toBe("Push");
    expect(app.plan().setsDone).toBe(0);
    const carried = visit(nov(16), { [catalogBenchRow.id]: carry(CATALOG.bench, { working: 2 }) });
    expect(app.get().dayState).toEqual(freshDayState(nov(17), null, carried));
    expect(app.plan().item(catalogBenchRow.id)).toMatchObject({ done: 2, owed: 1, remaining: 1 });
    // The skip was for yesterday only: fly is owed in full again.
    expect(app.plan().item(catalogFlyRow.id)).toMatchObject({ skipped: false, owed: 3 });
    expect(app.get().dayLog).toEqual([{ date: dateKey(nov(16)), planned: 6, done: 2 }]);
    expect(app.get().session).toBeNull();
  });

  it("the rest of it is what finishes the day, and then the plan moves on", async () => {
    const app = await boot();
    await app.log(catalogBenchRow.id, 2);
    app.advanceTo(nov(17, 9, 30));
    await app.finishDay();
    expect(app.plan().isComplete).toBe(true);
    // Tuesday owed 4 sets and did 4: complete, though the day took two calendar days.
    expect(app.plan().ledger.record()).toEqual({ date: dateKey(nov(17)), planned: 4, done: 4 });

    app.advanceTo(nov(18, 9, 30));
    expect(app.plan().dayName).toBe("Pull");
    expect(app.get().dayState.carried).toBeNull();
    expect(app.get().dayLog).toEqual([
      { date: dateKey(nov(16)), planned: 6, done: 2 },
      { date: dateKey(nov(17)), planned: 4, done: 4 },
    ]);
  });

  it("what is carried survives a restart", async () => {
    const first = await boot();
    await first.log(catalogBenchRow.id, 2);
    first.advanceTo(nov(17, 9, 30));
    expect(first.data.dayState).toMatchObject({
      carried: {
        startedOn: dateKey(nov(16)),
        items: { [catalogBenchRow.id]: { sets: { working: 2 } } },
      },
    });

    const second = await boot({}, { client: first.client, data: first.data }, nov(17, 10));
    expect(second.plan().item(catalogBenchRow.id)).toMatchObject({ done: 2, remaining: 1 });
    expect(second.get().session).toBeNull();
  });

  it("a completed floating day moves on to the next one", async () => {
    const app = await boot();
    await app.log(catalogBenchRow.id, 3);
    await app.log(catalogFlyRow.id, 3);
    app.advanceTo(nov(17, 9, 30));
    expect(app.plan().dayName).toBe("Pull");
    expect(app.data.dayState).toMatchObject({ dayId: "pull" });
  });

  describe("cycled pools", () => {
    async function cycled() {
      const app = await boot();
      app.get().editProgram((e) => e.setType("cycled"));
      const slot = app.get().program.days[0]!.slots[0]!;
      expect(slot.pool).toEqual([CATALOG.bench, CATALOG.fly]);
      expect(app.plan().items[0]!.exercise.id).toBe(CATALOG.bench);
      return { app, slot };
    }

    it("rotate after a day they were trained", async () => {
      const { app, slot } = await cycled();
      await app.finishDay();
      app.advanceTo(nov(17, 9, 30));
      expect(app.get().rotationState).toEqual({ [slot.id]: CATALOG.fly });
      expect(app.plan().dayName).toBe("Pull");
    });

    it("stay on the same exercise while their day comes back unfinished", async () => {
      const { app, slot } = await cycled();
      await app.log(slot.id, 1);
      app.advanceTo(nov(17, 9, 30));
      expect(app.get().rotationState).toEqual({});
      expect(app.plan().dayName).toBe("Push");
      expect(app.plan().items[0]!.exercise.id).toBe(CATALOG.bench);
      expect(app.plan().item(slot.id)).toMatchObject({ done: 1, remaining: 2 });
    });
  });

  it("a floating plan is not held up by a day that was skipped outright", async () => {
    const app = await boot();
    app.get().toggleSkip(catalogBenchRow.id);
    app.get().toggleSkip(catalogFlyRow.id);
    app.advanceTo(nov(17, 9, 30));
    expect(app.plan().dayName).toBe("Pull");
  });

  it("a set logged just after midnight belongs to the new day, plan item included", async () => {
    const app = await boot();
    app.get().openSession(catalogBenchRow.id);
    app.get().setReps(11);
    app.clock.now = nov(17, 0, 5);
    await app.get().logSet();

    const [set] = app.get().history;
    expect(app.get().dayState.date).toBe(dateKey(nov(17)));
    expect(set).toMatchObject({
      date: dateKey(nov(17)),
      value: 11,
      planItemId: catalogBenchRow.id,
    });
    expect(app.plan().item(catalogBenchRow.id)!.done).toBe(1);
    // Monday had no set: on a floating plan that is a day that waited, not one that was missed.
    expect(app.get().dayLog).toEqual([]);
  });

  it("an idle floating day is not on record, however long the app stays open", async () => {
    const app = await boot();
    for (const day of [17, 18, 19]) app.advanceTo(nov(day, 9, 30));
    expect(app.get().dayLog).toEqual([]);
    expect(selectStats(app.get()).completionThisWeek()).toBe(0);
    // Today counts from its first set, like the days before it.
    await app.log(catalogBenchRow.id, 3);
    expect(selectStats(app.get()).completionThisWeek()).toBe(50);
  });

  it("a clock that jumps back a day changes nothing: no day is closed, none reopened", async () => {
    const app = await boot();
    await app.log(catalogBenchRow.id, 3);
    await app.log(catalogFlyRow.id, 3);
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

  it("what is logged after the clock jumped back counts toward the day that is open", async () => {
    const app = await boot();
    app.advanceTo(nov(17, 9, 30));
    app.advanceTo(nov(16, 23, 30));

    await app.log(catalogBenchRow.id, 1);
    const [logged] = app.get().history;
    // Stamped with the moment it was done, and filed under the open day: it shows in today's list.
    expect(logged).toMatchObject({ ts: nov(16, 23, 30).toISOString(), date: dateKey(nov(17)) });
    expect(app.plan().item(catalogBenchRow.id)!.done).toBe(1);
    expect(app.data.history).toEqual([logged]);
  });

  it("after midnight, a set of an exercise the new day does not plan is logged as an extra", async () => {
    const mondayOnly: Program = {
      ...catalogPushPull,
      schedule: "weekday",
      days: [{ ...catalogPushPull.days[0]!, weekday: 1 }],
    };
    const app = await boot({ program: mondayOnly });
    app.get().openSession(catalogBenchRow.id);
    app.clock.now = nov(17, 0, 5);
    await app.get().logSet();

    const [set] = app.get().history;
    const item = app.plan().item(set!.planItemId!)!;
    expect(set!.date).toBe(dateKey(nov(17)));
    expect(item).toMatchObject({ isExtra: true, done: 1 });
    expect(item.exercise.id).toBe(CATALOG.bench);
    expect(app.get().session!.itemId).toBe(item.id);
  });

  it("opening the logger after midnight opens it on the new day", async () => {
    const app = await boot();
    await app.log(catalogBenchRow.id, 3);
    await app.log(catalogFlyRow.id, 3);
    app.get().closeSession();
    app.clock.now = nov(17, 0, 5);
    app.get().openSession();
    expect(app.get().dayState.date).toBe(dateKey(nov(17)));
    expect(app.plan().item(app.get().session!.itemId)!.exercise.id).toBe(CATALOG.row);
  });

  it("planned weekdays the app was not running for are on record as missed", async () => {
    const weekdays: Program = {
      ...catalogPushPull,
      schedule: "weekday",
      days: [
        { ...catalogPushPull.days[0]!, weekday: 1 },
        { ...catalogPushPull.days[1]!, weekday: 3 },
      ],
    };
    const first = await boot({ program: weekdays });
    await first.log(catalogBenchRow.id, 2);
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
    for (let i = 0; i < 5; i++) await app.log(catalogBenchRow.id, 1);
    app.get().openLibrary({ kind: "extra" });
    app.get().pickExercise(CATALOG.row);
    await app.get().logSet();
    expect(app.plan().setsDone).toBe(6);
    expect(selectStats(app.get()).completionThisWeek()).toBe(50);
  });

  it("rollover saves the day log, the day state and the rotation as one write", async () => {
    const app = await boot();
    await app.log(catalogBenchRow.id, 1);
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
    await first.log(catalogBenchRow.id, 3);
    await first.log(catalogFlyRow.id, 3);
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
