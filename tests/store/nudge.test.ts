import type { BootSnapshot } from "@nabd/ipc-client";
import { selectNudgeStatus, selectPendingNudge } from "@nabd/store";
import { nov } from "../support/builders";
import { CATALOG } from "../support/exercises";
import { catalogBenchRow, catalogFlyRow, catalogPushPull } from "../support/programs";
import { boot, fakeBackend } from "./fixtures";

describe("nudging", () => {
  // Workday 09:00–18:00, timer 50 min, minimum gap 15 min, idle after 30 s.
  const bootAt = (
    hour: number,
    minute = 0,
    initial: Partial<BootSnapshot> = { program: catalogPushPull },
  ) => boot(initial, fakeBackend(initial), nov(16, hour, minute));

  it("is quiet before work, counts down, nudges on the timer, and resets after a set", async () => {
    const app = await bootAt(8);
    expect(selectNudgeStatus(app.get()).state).toBe("off_hours");
    app.advanceTo(nov(16, 9, 30));
    expect(selectNudgeStatus(app.get())).toMatchObject({ state: "waiting", at: nov(16, 9, 50) });
    app.advanceTo(nov(16, 9, 50));
    expect(selectNudgeStatus(app.get())).toEqual({ state: "due", reason: "timer" });
    await app.log(catalogBenchRow.id, 1);
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
    app.get().editProgram((e) => e.addExercise(app.get().program.days[0]!.id, CATALOG.bench));
    // At once, not from the next beat of the clock: nothing is ever due for the hours before.
    expect(selectNudgeStatus(app.get())).toMatchObject({ state: "waiting", at: nov(16, 15, 50) });
    app.advanceTo(nov(16, 15, 1));
    expect(selectNudgeStatus(app.get())).toMatchObject({ state: "waiting", at: nov(16, 15, 50) });
  });

  it("an import or a schedule switch that brings work starts the count there and then too", async () => {
    const imported = await bootAt(9, 0, {});
    imported.advanceTo(nov(16, 15));
    await imported.importFile(
      JSON.stringify({ app: "Nabd", version: 2, program: catalogPushPull }),
    );
    expect(selectNudgeStatus(imported.get())).toMatchObject({
      state: "waiting",
      at: nov(16, 15, 50),
    });

    // A weekday plan whose only day is Tuesday: Monday is a rest day until the plan goes floating.
    const tuesdayOnly = {
      ...catalogPushPull,
      schedule: "weekday",
      days: [{ ...catalogPushPull.days[0]!, weekday: 2 }],
    };
    const switched = await bootAt(9, 0, { program: tuesdayOnly });
    switched.advanceTo(nov(16, 15));
    expect(selectNudgeStatus(switched.get()).state).toBe("nothing_left");
    switched.get().editProgram((e) => e.setSchedule("floating"));
    expect(selectNudgeStatus(switched.get())).toMatchObject({
      state: "waiting",
      at: nov(16, 15, 50),
    });
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
    expect(fired).toMatchObject({ reason: "idle", since: nov(16, 9, 20) });

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
    app.get().openSession(catalogFlyRow.id);
    await app.get().logSet();
    expect(app.get().history[0]).toMatchObject({ exId: CATALOG.fly, trigger: "timer" });
  });

  it("a session opened with no nudge pending is manual", async () => {
    const app = await bootAt(9);
    app.advanceTo(nov(16, 9, 30));
    await app.log(catalogBenchRow.id, 1);
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
    expect(second).toMatchObject({ reason: "timer", since: nov(16, 9, 56) });
    expect(second).not.toBe(first);
  });

  it("a nudge left unanswered is renewed once per interval, and stays the one nudge", async () => {
    const app = await bootAt(9);
    app.advanceTo(nov(16, 9, 50));
    const fired = selectPendingNudge(app.get())!;
    app.advanceTo(nov(16, 10, 39));
    expect(selectPendingNudge(app.get())).toBe(fired);
    app.advanceTo(nov(16, 10, 40));
    const reminded = selectPendingNudge(app.get())!;
    expect(reminded).not.toBe(fired);
    expect(reminded).toEqual({ ...fired, remindedAt: nov(16, 10, 40) });
    expect(selectNudgeStatus(app.get())).toEqual({ state: "due", reason: "timer" });
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
    overnight.get().tick(0, true);
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
    await app.log(catalogBenchRow.id, 3);
    await app.log(catalogFlyRow.id, 3);
    expect(selectNudgeStatus(app.get()).state).toBe("nothing_left");
  });

  it("a pause survives a restart on the same day and ends with the day", async () => {
    const first = await boot();
    first.get().togglePause();
    expect(first.data.dayState).toMatchObject({ paused: true });

    const sameDay = await boot({}, { client: first.client, data: first.data });
    expect(sameDay.get().dayState.paused).toBe(true);
    expect(selectNudgeStatus(sameDay.get()).state).toBe("paused");

    sameDay.advanceTo(nov(17, 9, 30));
    expect(sameDay.get().dayState.paused).toBe(false);
    expect(sameDay.data.dayState).toMatchObject({ paused: false });
  });
});
