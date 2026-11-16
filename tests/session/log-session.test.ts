import { dateKey } from "@nabd/domain";
import { LogSession } from "@nabd/session";
import { nov } from "../support/builders";
import { curl, curlRow, itemsFor } from "./fixtures";

describe("LogSession", () => {
  const { curlItem, plankItem } = itemsFor([]);
  const session = LogSession.open(curlItem, { reps: 8, weight: 25 }, "idle");

  it("opens on an exercise with a starting draft and remembers what prompted it", () => {
    expect(session).toMatchObject({ itemId: curlRow.id, reps: 8, weight: 25, trigger: "idle" });
    expect(session.performance).toEqual({ reps: 8, weight: 25 });
  });

  it("steps reps by one, seconds by five, and never below one", () => {
    expect(session.stepReps(1).reps).toBe(9);
    expect(session.withReps(1).stepReps(-1).reps).toBe(1);
    const hold = session.focus(plankItem, { reps: 45, weight: null });
    expect(hold.stepReps(1).reps).toBe(50);
    expect(hold.performance).toEqual({ reps: 50 - 5, weight: null });
  });

  it("steps and sets load, never below what the exercise can be given, ignoring garbage", () => {
    expect(session.stepWeight(1, 2.5).weight).toBe(27.5);
    // A dumbbell is never lighter than one step, and − never makes it heavier.
    expect(session.stepWeight(-1, 10).weight).toBe(15);
    expect(session.stepWeight(-1, 50).weight).toBe(25);
    expect(session.withWeight(2.5, 2.5).stepWeight(-1, 2.5).weight).toBe(2.5);
    expect(session.withWeight(2.5, 2.5).stepWeight(1, 2.5).weight).toBe(5);
    expect(session.withWeight(12.3456, 2.5).weight).toBe(12.346);
    expect(session.withWeight(Number.NaN, 2.5).weight).toBe(25);
    expect(session.withReps(Number.NaN).reps).toBe(8);
    expect(session.withReps(9.9).reps).toBe(9);
  });

  it("ignores a number no set could have, and stops stepping at the same bounds", () => {
    expect(session.withReps(0).reps).toBe(8);
    expect(session.withReps(999).reps).toBe(999);
    expect(session.withReps(1000).reps).toBe(8);
    expect(session.withReps(999).stepReps(1).reps).toBe(999);
    expect(session.withWeight(1000, 2.5).weight).toBe(1000);
    expect(session.withWeight(99999, 2.5).weight).toBe(25);
    expect(session.withWeight(-1, 2.5).weight).toBe(25);
    expect(session.withWeight(1000, 2.5).stepWeight(1, 2.5).weight).toBe(1000);
    // A hold is counted in seconds, of which a set can have many more.
    const hold = session.focus(plankItem, { reps: 45, weight: null });
    expect(hold.withReps(3600).reps).toBe(3600);
    expect(hold.withReps(6 * 60 * 60 + 1).reps).toBe(45);
  });

  it("holds a typed load to the same bounds as stepping: a dumbbell takes no less than one step", () => {
    expect(session.withWeight(0, 2.5).weight).toBe(25);
    expect(session.withWeight(1, 2.5).weight).toBe(25);
    expect(session.withWeight(2.5, 2.5).weight).toBe(2.5);
    expect(session.withWeight(2.5, 5).weight).toBe(25);
    // An exercise that needs no load can be given none.
    const hold = session.focus(plankItem, { reps: 45, weight: null });
    expect(hold.withWeight(0, 2.5).weight).toBe(0);
  });

  it("keeps the trigger and the running rest when moving to another exercise", () => {
    const resting = session.resting(nov(16, 10, 0), 90);
    const moved = resting.focus(plankItem, { reps: 45, weight: null });
    expect(moved.trigger).toBe("idle");
    expect(moved.restRemaining(nov(16, 10, 1))).toBe(30);
  });

  it("becomes a history row for its exercise, stamped with the plan item and the moment", () => {
    const at = nov(16, 10, 5);
    const day = { date: dateKey(at), session: dateKey(at) };
    expect(session.withReps(9).toLoggedSet(curlItem, "set-1", at, day)).toEqual({
      id: "set-1",
      exId: curl.id,
      exercise: "Curl",
      group: curl.group,
      muscles: [...curl.primary, ...curl.secondary],
      value: 9,
      weight: 25,
      ts: at.toISOString(),
      date: dateKey(at),
      trigger: "idle",
      planItemId: curlRow.id,
      // The curl's next prescribed set is its warm-up.
      setType: "warmup",
      session: dateKey(at),
    });
    const hold = session.focus(plankItem, { reps: 45, weight: null });
    expect(hold.toLoggedSet(plankItem, "set-2", at, day)).toMatchObject({
      value: 45,
      weight: null,
    });
    // It counts toward the day that is open, even if the clock now reads another, and belongs
    // to the session that day continues.
    const continued = { date: "2026-11-17", session: "2026-11-13" };
    expect(hold.toLoggedSet(plankItem, "set-3", at, continued)).toMatchObject(continued);
  });

  it("counts rest down to zero; no rest prescribed means none", () => {
    const resting = session.resting(nov(16, 10, 0), 90);
    expect(resting.restRemaining(nov(16, 10, 0))).toBe(90);
    expect(resting.restRemaining(nov(16, 10, 5))).toBe(0);
    expect(session.resting(nov(16, 10, 0), 0).restRemaining(nov(16, 10, 0))).toBe(0);
    expect(session.restRemaining(nov(16, 10, 0))).toBe(0);
  });
});
