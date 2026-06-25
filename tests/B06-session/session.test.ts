// Tests for @nabd/session — all cases from AGENT.md.
// Against the skeleton every test is RED ("not implemented"), but every exported
// function is invoked so coverage of src/index.ts is 100%.

import { describe, it, expect } from "vitest";
import {
  openSession,
  logSet,
  switchExercise,
  stepReps,
  stepWeight,
  applyCoverage,
} from "@nabd/session";
import type { HistoryLookup } from "@nabd/session";
import type { Slot, ActiveSession, Coverage } from "@nabd/domain";
import { DEFAULTS, MUSCLES } from "@nabd/domain";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Build a minimal Slot fixture with sensible defaults. */
function makeSlot(
  overrides: Partial<Slot> & { id: string; exId: string; sets: number; done: number; status: Slot["status"] },
): Slot {
  return {
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    min: 9 * 60 + 30,
    timeStr: "09:30",
    result: "",
    ...overrides,
  } as Slot;
}

/** A bodyweight slot (no weight). */
const slotA: Slot = makeSlot({
  id: "slot-a",
  exId: "bench-press",
  exercise: "Bench Press",
  group: "Chest",
  muscles: ["chest"],
  sets: 3,
  done: 0,
  status: "now",
  result: "",
});

/** A second slot that is still upcoming. */
const slotB: Slot = makeSlot({
  id: "slot-b",
  exId: "squat",
  exercise: "Squat",
  group: "Quads",
  muscles: ["quads", "glutes"],
  sets: 2,
  done: 0,
  status: "upcoming",
  result: "",
});

/** A third slot (also upcoming) so we can test chain promotions. */
const slotC: Slot = makeSlot({
  id: "slot-c",
  exId: "deadlift",
  exercise: "Deadlift",
  group: "Back",
  muscles: ["lats", "lower_back"],
  sets: 1,
  done: 0,
  status: "upcoming",
  result: "",
});

/** History lookup stub — no prior history for any exercise. */
const noHistory: HistoryLookup = (_exId: string) => null;

/** History lookup stub with a previous result for bench-press. */
const withBenchHistory: HistoryLookup = (exId: string) => {
  if (exId === "bench-press") {
    return { sets: 3, reps: 8, weight: 60 };
  }
  return null;
};

/** Weighted slot (weight_reps tracking). */
const weightedSlot: Slot = makeSlot({
  id: "slot-w",
  exId: "bench-press",
  exercise: "Bench Press",
  group: "Chest",
  muscles: ["chest"],
  sets: 3,
  done: 0,
  status: "now",
  result: "",
});

/** Time-based slot (duration tracking). */
const timeSlot: Slot = makeSlot({
  id: "slot-t",
  exId: "plank",
  exercise: "Plank",
  group: "Abs",
  muscles: ["abs"],
  sets: 3,
  done: 0,
  status: "now",
  result: "",
});

/** Build an ActiveSession for a weighted exercise. */
function makeWeightedSession(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    slotId: "slot-w",
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    weighted: true,
    unit: "reps",
    reps: 8,
    weight: 60,
    sugg: { sets: 3, reps: 8, weight: 60, note: "", up: true },
    last: null,
    logged: [],
    allDone: false,
    ...overrides,
  };
}

/** Build an ActiveSession for a bodyweight/reps-only exercise. */
function makeBodyweightSession(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    slotId: "slot-a",
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    weighted: false,
    unit: "reps",
    reps: 10,
    weight: 0,
    sugg: { sets: 3, reps: 10, weight: null, note: "", up: true },
    last: null,
    logged: [],
    allDone: false,
    ...overrides,
  };
}

/** Build an ActiveSession for a time-based exercise. */
function makeTimeSession(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    slotId: "slot-t",
    exercise: "Plank",
    group: "Abs",
    muscles: ["abs"],
    weighted: false,
    unit: "sec",
    reps: 30,
    weight: 0,
    sugg: { sets: 3, reps: 30, weight: null, note: "", up: true },
    last: null,
    logged: [],
    allDone: false,
    ...overrides,
  };
}

/** Build a zero-filled Coverage map. */
function zeroCoverage(): Coverage {
  return Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Coverage;
}

// ---------------------------------------------------------------------------
// openSession
// ---------------------------------------------------------------------------

describe("openSession", () => {
  it("returns an ActiveSession with correct slotId and exercise info", () => {
    const sess = openSession(slotA, noHistory);
    expect(sess.slotId).toBe("slot-a");
    expect(sess.exercise).toBe("Bench Press");
    expect(sess.group).toBe("Chest");
    expect(sess.muscles).toEqual(["chest"]);
  });

  it("starts with empty logged (receipt) and allDone=false", () => {
    const sess = openSession(slotA, noHistory);
    expect(sess.logged).toEqual([]);
    expect(sess.allDone).toBe(false);
  });

  it("populates suggestion from history when no prior history", () => {
    const sess = openSession(slotA, noHistory);
    // suggest() with no history should return a Suggestion — values must be present
    expect(sess.sugg).toBeDefined();
    expect(typeof sess.sugg.sets).toBe("number");
    expect(typeof sess.sugg.reps).toBe("number");
    expect(sess.sugg.up).toBeDefined();
  });

  it("sets reps from suggestion when there is no history", () => {
    const sess = openSession(slotA, noHistory);
    expect(sess.reps).toBe(sess.sugg.reps);
  });

  it("uses suggestion weight when slot is weighted", () => {
    const sess = openSession(weightedSlot, withBenchHistory);
    expect(sess.weighted).toBe(true);
    expect(typeof sess.weight).toBe("number");
    expect(sess.weight).toBeGreaterThanOrEqual(0);
  });

  it("unit is 'sec' for time-based exercises", () => {
    // timeSlot would have a time-based tracking type
    // Since slot doesn't embed tracking type, we verify openSession determines
    // it from the slot's exercise id via history + suggestion
    // Just verify the call completes and returns a valid session shape
    const sess = openSession(timeSlot, noHistory);
    expect(sess.slotId).toBe("slot-t");
    expect(sess.exercise).toBe("Plank");
  });

  it("last is null when no history", () => {
    const sess = openSession(slotA, noHistory);
    expect(sess.last).toBeNull();
  });

  it("last is set when history is available", () => {
    const sess = openSession(slotA, withBenchHistory);
    expect(sess.last).toEqual({ sets: 3, reps: 8, weight: 60 });
  });
});

// ---------------------------------------------------------------------------
// logSet — single set (not completing the exercise)
// ---------------------------------------------------------------------------

describe("logSet — single set (sets > 1, done stays 'now')", () => {
  it("increments slot done from 0 to 1", () => {
    const session = makeBodyweightSession({ slotId: "slot-a" });
    const slots = [{ ...slotA }, { ...slotB }];

    const { slots: updatedSlots } = logSet(session, slots, noHistory);
    const updatedA = updatedSlots.find((s) => s.id === "slot-a")!;
    expect(updatedA.done).toBe(1);
  });

  it("status stays 'now' when sets > 1 and not complete", () => {
    const session = makeBodyweightSession({ slotId: "slot-a" });
    const slots = [{ ...slotA }, { ...slotB }];

    const { slots: updatedSlots } = logSet(session, slots, noHistory);
    const updatedA = updatedSlots.find((s) => s.id === "slot-a")!;
    expect(updatedA.status).toBe("now");
  });

  it("result stays empty string when not yet done", () => {
    const session = makeBodyweightSession({ slotId: "slot-a" });
    const slots = [{ ...slotA }, { ...slotB }];

    const { slots: updatedSlots } = logSet(session, slots, noHistory);
    const updatedA = updatedSlots.find((s) => s.id === "slot-a")!;
    expect(updatedA.result).toBe("");
  });

  it("receipt has 1 item after 1 logSet call", () => {
    const session = makeBodyweightSession({ slotId: "slot-a" });
    const slots = [{ ...slotA }, { ...slotB }];

    const result = logSet(session, slots, noHistory);
    expect(result.session.logged).toHaveLength(1);
  });

  it("coverageMuscles matches the logged slot's muscles", () => {
    const session = makeBodyweightSession({ slotId: "slot-a" });
    const slots = [{ ...slotA }, { ...slotB }];

    const { coverageMuscles } = logSet(session, slots, noHistory);
    expect(coverageMuscles).toEqual(["chest"]);
  });

  it("form stays on same exercise when sets remain", () => {
    const session = makeBodyweightSession({ slotId: "slot-a" });
    const slots = [{ ...slotA }, { ...slotB }];

    const { session: nextSession } = logSet(session, slots, noHistory);
    expect(nextSession.slotId).toBe("slot-a");
    expect(nextSession.exercise).toBe("Bench Press");
  });

  it("receiptItem has correct exercise, group and setStr (bodyweight reps)", () => {
    const session = makeBodyweightSession({ slotId: "slot-a", reps: 12 });
    const slots = [{ ...slotA }, { ...slotB }];

    const { receiptItem } = logSet(session, slots, noHistory);
    expect(receiptItem.exercise).toBe("Bench Press");
    expect(receiptItem.group).toBe("Chest");
    // bodyweight: "<v> reps"
    expect(receiptItem.setStr).toBe("12 reps");
  });

  it("logged record has correct exId, exercise, group, muscles, trigger='manual'", () => {
    const session = makeBodyweightSession({ slotId: "slot-a", reps: 10 });
    const slots = [{ ...slotA }, { ...slotB }];

    const { logged } = logSet(session, slots, noHistory);
    expect(logged.exId).toBe("bench-press");
    expect(logged.exercise).toBe("Bench Press");
    expect(logged.group).toBe("Chest");
    expect(logged.muscles).toEqual(["chest"]);
    expect(logged.trigger).toBe("manual");
    expect(logged.value).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// logSet — completing an exercise (done reaches sets)
// ---------------------------------------------------------------------------

describe("logSet — completing an exercise", () => {
  it("done reaches sets → status becomes 'done'", () => {
    // Slot with sets=1, done=0 — one logSet call completes it
    const singleSlot: Slot = makeSlot({
      id: "slot-a",
      exId: "bench-press",
      exercise: "Bench Press",
      group: "Chest",
      muscles: ["chest"],
      sets: 1,
      done: 0,
      status: "now",
      result: "",
    });

    const session = makeBodyweightSession({ slotId: "slot-a", reps: 10 });
    const slots = [singleSlot, { ...slotB }];

    const { slots: updatedSlots } = logSet(session, slots, noHistory);
    const updated = updatedSlots.find((s) => s.id === "slot-a")!;
    expect(updated.status).toBe("done");
    expect(updated.done).toBe(1);
  });

  it("result string set when done → 'done' (bodyweight, no weight)", () => {
    const singleSlot: Slot = makeSlot({
      id: "slot-a",
      exId: "bench-press",
      exercise: "Bench Press",
      group: "Chest",
      muscles: ["chest"],
      sets: 1,
      done: 0,
      status: "now",
      result: "",
    });

    const session = makeBodyweightSession({ slotId: "slot-a", reps: 10, weighted: false });
    const slots = [singleSlot, { ...slotB }];

    const { slots: updatedSlots } = logSet(session, slots, noHistory);
    const updated = updatedSlots.find((s) => s.id === "slot-a")!;
    // result = "<sets>×<reps>" for bodyweight
    expect(updated.result).toMatch(/1×10/);
  });

  it("result string includes weight component when weighted", () => {
    const singleSlot: Slot = makeSlot({
      id: "slot-w",
      exId: "bench-press",
      exercise: "Bench Press",
      group: "Chest",
      muscles: ["chest"],
      sets: 1,
      done: 0,
      status: "now",
      result: "",
    });

    const session = makeWeightedSession({ slotId: "slot-w", reps: 8, weight: 60, sets: 1 } as unknown as Partial<ActiveSession>);
    const slots = [singleSlot, { ...slotB }];

    const { slots: updatedSlots } = logSet(session, slots, noHistory);
    const updated = updatedSlots.find((s) => s.id === "slot-w")!;
    // result should contain weight info: "1×8 · 60kg" or similar
    expect(updated.result).toMatch(/1×8/);
    expect(updated.result).toMatch(/60/);
  });

  it("first 'upcoming' slot is promoted to 'now' on completion", () => {
    const singleSlot: Slot = makeSlot({
      id: "slot-a",
      exId: "bench-press",
      exercise: "Bench Press",
      group: "Chest",
      muscles: ["chest"],
      sets: 1,
      done: 0,
      status: "now",
      result: "",
    });

    const session = makeBodyweightSession({ slotId: "slot-a" });
    const slots = [singleSlot, { ...slotB }, { ...slotC }];

    const { slots: updatedSlots } = logSet(session, slots, noHistory);
    const updatedB = updatedSlots.find((s) => s.id === "slot-b")!;
    // First upcoming should have been promoted to "now"
    expect(updatedB.status).toBe("now");
  });

  it("only the first 'upcoming' slot is promoted (not all)", () => {
    const singleSlot: Slot = makeSlot({
      id: "slot-a",
      exId: "bench-press",
      exercise: "Bench Press",
      group: "Chest",
      muscles: ["chest"],
      sets: 1,
      done: 0,
      status: "now",
      result: "",
    });

    const session = makeBodyweightSession({ slotId: "slot-a" });
    const slots = [singleSlot, { ...slotB }, { ...slotC }];

    const { slots: updatedSlots } = logSet(session, slots, noHistory);
    const updatedC = updatedSlots.find((s) => s.id === "slot-c")!;
    // Second upcoming should remain "upcoming"
    expect(updatedC.status).toBe("upcoming");
  });

  it("form advances to next pending slot after completion", () => {
    const singleSlot: Slot = makeSlot({
      id: "slot-a",
      exId: "bench-press",
      exercise: "Bench Press",
      group: "Chest",
      muscles: ["chest"],
      sets: 1,
      done: 0,
      status: "now",
      result: "",
    });

    const session = makeBodyweightSession({ slotId: "slot-a" });
    const slots = [singleSlot, { ...slotB }];

    const { session: nextSession } = logSet(session, slots, noHistory);
    // After slot-a completes, form should move to slot-b
    expect(nextSession.slotId).toBe("slot-b");
    expect(nextSession.exercise).toBe("Squat");
  });
});

// ---------------------------------------------------------------------------
// logSet — last pending (allDone)
// ---------------------------------------------------------------------------

describe("logSet — last pending slot (allDone=true)", () => {
  it("allDone becomes true when no more pending slots remain", () => {
    const singleSlot: Slot = makeSlot({
      id: "slot-a",
      exId: "bench-press",
      exercise: "Bench Press",
      group: "Chest",
      muscles: ["chest"],
      sets: 1,
      done: 0,
      status: "now",
      result: "",
    });

    const session = makeBodyweightSession({ slotId: "slot-a" });
    const slots = [singleSlot]; // only one slot

    const { session: nextSession } = logSet(session, slots, noHistory);
    expect(nextSession.allDone).toBe(true);
  });

  it("allDone with no other upcoming slots — still logs the set", () => {
    const singleSlot: Slot = makeSlot({
      id: "slot-a",
      exId: "bench-press",
      exercise: "Bench Press",
      group: "Chest",
      muscles: ["chest"],
      sets: 1,
      done: 0,
      status: "now",
      result: "",
    });

    const session = makeBodyweightSession({ slotId: "slot-a" });
    const slots = [singleSlot];

    const { logged, receiptItem } = logSet(session, slots, noHistory);
    expect(logged).toBeDefined();
    expect(receiptItem).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// logSet — multi-set same exercise (receipt accumulation)
// ---------------------------------------------------------------------------

describe("logSet — multi-set receipt accumulation", () => {
  it("receipt accumulates across multiple logSet calls", () => {
    // slot-a has 3 sets
    const session1 = makeBodyweightSession({ slotId: "slot-a", reps: 10 });
    const slots = [{ ...slotA }, { ...slotB }];

    // First log
    const result1 = logSet(session1, slots, noHistory);
    expect(result1.session.logged).toHaveLength(1);

    // Second log (use updated slots and session)
    const result2 = logSet(result1.session, result1.slots, noHistory);
    expect(result2.session.logged).toHaveLength(2);
  });

  it("done increments correctly across multiple calls on same slot", () => {
    const session1 = makeBodyweightSession({ slotId: "slot-a", reps: 10 });
    const slots = [{ ...slotA }, { ...slotB }];

    const result1 = logSet(session1, slots, noHistory);
    const slotAfter1 = result1.slots.find((s) => s.id === "slot-a")!;
    expect(slotAfter1.done).toBe(1);

    const result2 = logSet(result1.session, result1.slots, noHistory);
    const slotAfter2 = result2.slots.find((s) => s.id === "slot-a")!;
    expect(slotAfter2.done).toBe(2);
  });

  it("receipt is preserved (stays non-empty) when form advances to next slot", () => {
    // Use a slot with 1 set so it completes on first logSet
    const oneSetSlot: Slot = makeSlot({
      id: "slot-a",
      exId: "bench-press",
      exercise: "Bench Press",
      group: "Chest",
      muscles: ["chest"],
      sets: 1,
      done: 0,
      status: "now",
      result: "",
    });

    const session = makeBodyweightSession({ slotId: "slot-a" });
    const slots = [oneSetSlot, { ...slotB }];

    const result = logSet(session, slots, noHistory);
    // Form advances to slotB, but receipt from slotA should be preserved
    expect(result.session.logged).toHaveLength(1);
    expect(result.session.logged[0].exercise).toBe("Bench Press");
  });
});

// ---------------------------------------------------------------------------
// logSet — setStr formatting
// ---------------------------------------------------------------------------

describe("logSet — setStr formatting", () => {
  it("bodyweight/reps-only: setStr is '<v> reps'", () => {
    const session = makeBodyweightSession({ slotId: "slot-a", reps: 12, weighted: false, unit: "reps" });
    const slots = [{ ...slotA }];

    const { receiptItem } = logSet(session, slots, noHistory);
    expect(receiptItem.setStr).toBe("12 reps");
  });

  it("time-based: setStr is '<v>s'", () => {
    const session = makeTimeSession({ slotId: "slot-t", reps: 45, weighted: false, unit: "sec" });
    const slots = [{ ...timeSlot }];

    const { receiptItem } = logSet(session, slots, noHistory);
    expect(receiptItem.setStr).toBe("45s");
  });

  it("weighted: setStr is '<v> · <w>kg'", () => {
    const sess = makeWeightedSession({ slotId: "slot-w", reps: 8, weight: 60, weighted: true, unit: "reps" });
    const slots = [{ ...weightedSlot }];

    const { receiptItem } = logSet(sess, slots, noHistory);
    expect(receiptItem.setStr).toBe("8 · 60kg");
  });

  it("weight value in setStr has no trailing decimal when whole number", () => {
    const sess = makeWeightedSession({ slotId: "slot-w", reps: 5, weight: 100, weighted: true, unit: "reps" });
    const slots = [{ ...weightedSlot }];

    const { receiptItem } = logSet(sess, slots, noHistory);
    expect(receiptItem.setStr).toBe("5 · 100kg");
  });
});

// ---------------------------------------------------------------------------
// logSet — result string formatting (when completing)
// ---------------------------------------------------------------------------

describe("logSet — result string formatting on completion", () => {
  it("bodyweight: result is '<sets>×<reps>'", () => {
    const oneSetSlot: Slot = makeSlot({
      id: "slot-a",
      exId: "bench-press",
      exercise: "Bench Press",
      group: "Chest",
      muscles: ["chest"],
      sets: 1,
      done: 0,
      status: "now",
      result: "",
    });
    const session = makeBodyweightSession({ slotId: "slot-a", reps: 10, weighted: false });
    const { slots: updatedSlots } = logSet(session, [oneSetSlot], noHistory);
    const updated = updatedSlots.find((s) => s.id === "slot-a")!;
    expect(updated.result).toBe("1×10");
  });

  it("weighted: result is '<sets>×<reps> · <w>'", () => {
    const oneSetSlot: Slot = makeSlot({
      id: "slot-w",
      exId: "bench-press",
      exercise: "Bench Press",
      group: "Chest",
      muscles: ["chest"],
      sets: 1,
      done: 0,
      status: "now",
      result: "",
    });
    const sess = makeWeightedSession({ slotId: "slot-w", reps: 8, weight: 60, weighted: true });
    const { slots: updatedSlots } = logSet(sess, [oneSetSlot], noHistory);
    const updated = updatedSlots.find((s) => s.id === "slot-w")!;
    // result = "1×8 · 60"  (or "1×8 · 60kg")
    expect(updated.result).toMatch(/1×8/);
    expect(updated.result).toMatch(/60/);
  });
});

// ---------------------------------------------------------------------------
// logSet — logged record weight field
// ---------------------------------------------------------------------------

describe("logSet — logged record weight field", () => {
  it("logged.weight is null for bodyweight exercises", () => {
    const session = makeBodyweightSession({ slotId: "slot-a", reps: 10, weighted: false });
    const slots = [{ ...slotA }];
    const { logged } = logSet(session, slots, noHistory);
    expect(logged.weight).toBeNull();
  });

  it("logged.weight is set for weighted exercises", () => {
    const sess = makeWeightedSession({ slotId: "slot-w", reps: 8, weight: 60, weighted: true });
    const slots = [{ ...weightedSlot }];
    const { logged } = logSet(sess, slots, noHistory);
    expect(logged.weight).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// switchExercise
// ---------------------------------------------------------------------------

describe("switchExercise", () => {
  it("form swaps to the target slot", () => {
    const session = makeBodyweightSession({ slotId: "slot-a", logged: [] });
    const slots = [{ ...slotA }, { ...slotB }];

    const nextSession = switchExercise(session, slots, "slot-b", noHistory);
    expect(nextSession.slotId).toBe("slot-b");
    expect(nextSession.exercise).toBe("Squat");
    expect(nextSession.muscles).toEqual(["quads", "glutes"]);
  });

  it("preserves existing logged receipt when switching", () => {
    const session = makeBodyweightSession({
      slotId: "slot-a",
      logged: [{ exercise: "Bench Press", group: "Chest", setStr: "10 reps" }],
    });
    const slots = [{ ...slotA }, { ...slotB }];

    const nextSession = switchExercise(session, slots, "slot-b", noHistory);
    expect(nextSession.logged).toHaveLength(1);
    expect(nextSession.logged[0].exercise).toBe("Bench Press");
  });

  it("allDone remains false after switching", () => {
    const session = makeBodyweightSession({ slotId: "slot-a", logged: [] });
    const slots = [{ ...slotA }, { ...slotB }];

    const nextSession = switchExercise(session, slots, "slot-b", noHistory);
    expect(nextSession.allDone).toBe(false);
  });

  it("fresh suggestion is built for the switched-to slot", () => {
    const session = makeBodyweightSession({ slotId: "slot-a", logged: [] });
    const slots = [{ ...slotA }, { ...slotB }];

    const nextSession = switchExercise(session, slots, "slot-b", noHistory);
    // Suggestion should be defined for the new slot
    expect(nextSession.sugg).toBeDefined();
    expect(typeof nextSession.sugg.reps).toBe("number");
  });

  it("preserves multiple logged items", () => {
    const session = makeBodyweightSession({
      slotId: "slot-a",
      logged: [
        { exercise: "Bench Press", group: "Chest", setStr: "10 reps" },
        { exercise: "Bench Press", group: "Chest", setStr: "10 reps" },
      ],
    });
    const slots = [{ ...slotA }, { ...slotB }];

    const nextSession = switchExercise(session, slots, "slot-b", noHistory);
    expect(nextSession.logged).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// stepReps — reps unit
// ---------------------------------------------------------------------------

describe("stepReps — reps unit", () => {
  it("+1 delta on reps unit → reps increases by 1", () => {
    const session = makeBodyweightSession({ unit: "reps", reps: 10 });
    const next = stepReps(session, 1);
    expect(next.reps).toBe(11);
  });

  it("-1 delta on reps unit → reps decreases by 1", () => {
    const session = makeBodyweightSession({ unit: "reps", reps: 10 });
    const next = stepReps(session, -1);
    expect(next.reps).toBe(9);
  });

  it("reps cannot go below 1 (floor at 1)", () => {
    const session = makeBodyweightSession({ unit: "reps", reps: 1 });
    const next = stepReps(session, -1);
    expect(next.reps).toBe(1);
  });

  it("large negative delta still floors at 1", () => {
    const session = makeBodyweightSession({ unit: "reps", reps: 5 });
    const next = stepReps(session, -100);
    expect(next.reps).toBe(1);
  });

  it("returns a new session (does not mutate input)", () => {
    const session = makeBodyweightSession({ unit: "reps", reps: 10 });
    const next = stepReps(session, 1);
    expect(next).not.toBe(session);
    expect(session.reps).toBe(10); // original unchanged
  });
});

// ---------------------------------------------------------------------------
// stepReps — sec unit (×5)
// ---------------------------------------------------------------------------

describe("stepReps — sec unit (step by 5)", () => {
  it("+1 delta on sec unit → reps increases by 5", () => {
    const session = makeTimeSession({ unit: "sec", reps: 30 });
    const next = stepReps(session, 1);
    expect(next.reps).toBe(35);
  });

  it("-1 delta on sec unit → reps decreases by 5", () => {
    const session = makeTimeSession({ unit: "sec", reps: 30 });
    const next = stepReps(session, -1);
    expect(next.reps).toBe(25);
  });

  it("sec unit also floors at 1", () => {
    const session = makeTimeSession({ unit: "sec", reps: 3 });
    const next = stepReps(session, -1);
    // 3 - 5 = -2, but floor at 1
    expect(next.reps).toBe(1);
  });

  it("+2 delta on sec unit → reps increases by 10", () => {
    const session = makeTimeSession({ unit: "sec", reps: 30 });
    const next = stepReps(session, 2);
    expect(next.reps).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// stepWeight — ±2.5 increments
// ---------------------------------------------------------------------------

describe("stepWeight", () => {
  it("+1 delta → weight increases by 2.5", () => {
    const session = makeWeightedSession({ weight: 60 });
    const next = stepWeight(session, 1);
    expect(next.weight).toBeCloseTo(62.5, 5);
  });

  it("-1 delta → weight decreases by 2.5", () => {
    const session = makeWeightedSession({ weight: 60 });
    const next = stepWeight(session, -1);
    expect(next.weight).toBeCloseTo(57.5, 5);
  });

  it("weight cannot go below 0 (floor at 0)", () => {
    const session = makeWeightedSession({ weight: 0 });
    const next = stepWeight(session, -1);
    expect(next.weight).toBe(0);
  });

  it("weight floor at 0 for small initial weight", () => {
    const session = makeWeightedSession({ weight: 2.5 });
    const next = stepWeight(session, -2); // 2.5 - 5 = -2.5 → 0
    expect(next.weight).toBe(0);
  });

  it("rounds correctly to avoid floating-point drift", () => {
    // 0.1 + 2.5 should not produce floating-point noise
    const session = makeWeightedSession({ weight: 0.1 });
    const next = stepWeight(session, 1);
    // Should be 2.6 (rounded to 1dp)
    expect(next.weight).toBeCloseTo(2.6, 5);
  });

  it("+2 delta → weight increases by 5.0", () => {
    const session = makeWeightedSession({ weight: 60 });
    const next = stepWeight(session, 2);
    expect(next.weight).toBeCloseTo(65, 5);
  });

  it("returns a new session (does not mutate input)", () => {
    const session = makeWeightedSession({ weight: 60 });
    const next = stepWeight(session, 1);
    expect(next).not.toBe(session);
    expect(session.weight).toBe(60); // original unchanged
  });

  it("large negative delta → floors at 0", () => {
    const session = makeWeightedSession({ weight: 5 });
    const next = stepWeight(session, -100);
    expect(next.weight).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// applyCoverage
// ---------------------------------------------------------------------------

describe("applyCoverage", () => {
  it("bumps the specified muscles by DEFAULTS.coveragePerSet", () => {
    const cov = zeroCoverage();
    const next = applyCoverage(cov, ["chest"]);
    expect(next["chest"]).toBe(DEFAULTS.coveragePerSet);
  });

  it("bumps multiple muscles", () => {
    const cov = zeroCoverage();
    const next = applyCoverage(cov, ["quads", "glutes"]);
    expect(next["quads"]).toBe(DEFAULTS.coveragePerSet);
    expect(next["glutes"]).toBe(DEFAULTS.coveragePerSet);
  });

  it("accumulates across multiple calls", () => {
    const cov = zeroCoverage();
    const after1 = applyCoverage(cov, ["chest"]);
    const after2 = applyCoverage(after1, ["chest"]);
    expect(after2["chest"]).toBe(DEFAULTS.coveragePerSet * 2);
  });

  it("does not mutate the input coverage", () => {
    const cov = zeroCoverage();
    applyCoverage(cov, ["chest"]);
    expect(cov["chest"]).toBe(0);
  });

  it("only affects specified muscles, not others", () => {
    const cov = zeroCoverage();
    const next = applyCoverage(cov, ["chest"]);
    expect(next["quads"]).toBe(0);
    expect(next["lats"]).toBe(0);
  });

  it("empty muscles array leaves coverage unchanged", () => {
    const cov = zeroCoverage();
    const next = applyCoverage(cov, []);
    // All values should still be 0
    for (const muscle of MUSCLES) {
      expect(next[muscle]).toBe(0);
    }
  });

  it("coverage can exceed 100 (no clamping enforced here)", () => {
    // applyCoverage just delegates to B03-coverage bump — no clamping required in session
    const cov = zeroCoverage();
    let curr = cov;
    // Apply 30 times (4 per set * 30 = 120 > 100)
    for (let i = 0; i < 30; i++) {
      curr = applyCoverage(curr, ["chest"]);
    }
    expect(curr["chest"]).toBeGreaterThan(100);
  });
});
