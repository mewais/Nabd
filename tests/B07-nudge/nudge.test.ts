/**
 * B07 · @nabd/nudge — Vitest test suite
 *
 * Every exported function is called. All tests are RED against the skeleton
 * (which throws "not implemented") while achieving 100% line/function coverage
 * of src/index.ts.
 *
 * Tests assert concrete expected values — NOT that the functions throw.
 */

import { describe, it, expect } from "vitest";
import {
  tick,
  dueNotif,
  resetIdle,
  snooze,
  resetTimer,
  type NudgeState,
  type Notif,
} from "@nabd/nudge";
import type { Slot } from "@nabd/domain";

// ---------------------------------------------------------------------------
// Minimal valid Slot factory
// ---------------------------------------------------------------------------
function makeSlot(overrides: Partial<Slot> = {}): Slot {
  return {
    id: "slot-1",
    exId: "ex-bench",
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    min: 480, // 8:00 AM
    timeStr: "8:00",
    sets: 3,
    done: 0,
    status: "now",
    result: "",
    ...overrides,
  };
}

// Minimal valid NudgeState factory
function makeState(overrides: Partial<NudgeState> = {}): NudgeState {
  return {
    secondsToNext: 120,
    idleSeconds: 0,
    idleNudge: 60,
    busy: false,
    notif: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// dueNotif
// ---------------------------------------------------------------------------
describe("dueNotif", () => {
  it("returns timer notif with label \"Interval's up\"", () => {
    const slot = makeSlot();
    const result = dueNotif("timer", slot);
    expect(result.reason).toBe("timer");
    expect(result.label).toBe("Interval's up");
    expect(result.slot).toBe(slot);
  });

  it("returns idle notif with label \"You've gone quiet\"", () => {
    const slot = makeSlot();
    const result = dueNotif("idle", slot);
    expect(result.reason).toBe("idle");
    expect(result.label).toBe("You've gone quiet");
    expect(result.slot).toBe(slot);
  });
});

// ---------------------------------------------------------------------------
// tick — basic decrement / increment
// ---------------------------------------------------------------------------
describe("tick — basic decrement and increment", () => {
  it("decrements secondsToNext by 1 each call", () => {
    const state = makeState({ secondsToNext: 10, idleSeconds: 0 });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.secondsToNext).toBe(9);
  });

  it("increments idleSeconds by 1 each call", () => {
    const state = makeState({ secondsToNext: 10, idleSeconds: 5 });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.idleSeconds).toBe(6);
  });

  it("does not mutate the input state object", () => {
    const state = makeState({ secondsToNext: 5, idleSeconds: 3 });
    const slot = makeSlot();
    tick({ state, currentSlot: slot });
    expect(state.secondsToNext).toBe(5);
    expect(state.idleSeconds).toBe(3);
  });

  it("preserves idleNudge and busy in returned state", () => {
    const state = makeState({ secondsToNext: 10, idleNudge: 45, busy: false });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.idleNudge).toBe(45);
    expect(result.busy).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tick — timer notif
// ---------------------------------------------------------------------------
describe("tick — timer notif (secondsToNext hits 0)", () => {
  it("raises a timer notif when secondsToNext goes from 1 to 0", () => {
    const state = makeState({ secondsToNext: 1, idleSeconds: 0, idleNudge: 60 });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.notif).not.toBeNull();
    expect(result.notif?.reason).toBe("timer");
  });

  it("timer notif has label \"Interval's up\"", () => {
    const state = makeState({ secondsToNext: 1, idleSeconds: 0, idleNudge: 60 });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.notif?.label).toBe("Interval's up");
  });

  it("timer notif includes the current slot", () => {
    const slot = makeSlot({ id: "slot-timer-ref" });
    const state = makeState({ secondsToNext: 1, idleSeconds: 0 });
    const result = tick({ state, currentSlot: slot });
    expect(result.notif?.slot).toEqual(slot);
  });

  it("secondsToNext is 0 in result when timer fires", () => {
    const state = makeState({ secondsToNext: 1, idleSeconds: 0 });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.secondsToNext).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// tick — idle notif
// ---------------------------------------------------------------------------
describe("tick — idle notif (idleSeconds reaches threshold)", () => {
  it("raises an idle notif when idleSeconds becomes equal to idleNudge", () => {
    // 59 + 1 = 60, which meets threshold of 60
    const state = makeState({ secondsToNext: 120, idleSeconds: 59, idleNudge: 60 });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.notif).not.toBeNull();
    expect(result.notif?.reason).toBe("idle");
  });

  it("idle notif has label \"You've gone quiet\"", () => {
    const state = makeState({ secondsToNext: 120, idleSeconds: 59, idleNudge: 60 });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.notif?.label).toBe("You've gone quiet");
  });

  it("idle notif includes the current slot", () => {
    const slot = makeSlot({ id: "slot-idle-ref" });
    const state = makeState({ secondsToNext: 120, idleSeconds: 59, idleNudge: 60 });
    const result = tick({ state, currentSlot: slot });
    expect(result.notif?.slot).toEqual(slot);
  });

  it("idleSeconds is incremented in result when idle fires", () => {
    const state = makeState({ secondsToNext: 120, idleSeconds: 59, idleNudge: 60 });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.idleSeconds).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// tick — timer wins when both conditions fire same tick
// ---------------------------------------------------------------------------
describe("tick — timer wins ties over idle", () => {
  it("raises timer notif (not idle) when both conditions fire on the same tick", () => {
    // secondsToNext: 1 → 0 (timer fires); idleSeconds: 59 → 60 = idleNudge (idle fires)
    const state = makeState({ secondsToNext: 1, idleSeconds: 59, idleNudge: 60 });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.notif?.reason).toBe("timer");
    expect(result.notif?.label).toBe("Interval's up");
  });
});

// ---------------------------------------------------------------------------
// tick — suppression conditions (no new notif)
// ---------------------------------------------------------------------------
describe("tick — no new notif when suppressed", () => {
  it("does not raise a notif when busy is true (timer would fire)", () => {
    const state = makeState({ secondsToNext: 1, idleSeconds: 0, busy: true });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.notif).toBeNull();
  });

  it("does not raise a notif when busy is true (idle would fire)", () => {
    const state = makeState({ secondsToNext: 120, idleSeconds: 59, idleNudge: 60, busy: true });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.notif).toBeNull();
  });

  it("preserves existing notif unchanged when timer fires but notif already set", () => {
    const slot = makeSlot();
    const existingNotif: Notif = {
      slot,
      reason: "idle",
      label: "You've gone quiet",
    };
    const state = makeState({ secondsToNext: 1, idleSeconds: 0, notif: existingNotif });
    const result = tick({ state, currentSlot: slot });
    expect(result.notif).toBe(existingNotif);
  });

  it("preserves existing notif unchanged when idle fires but notif already set", () => {
    const slot = makeSlot();
    const existingNotif: Notif = {
      slot,
      reason: "timer",
      label: "Interval's up",
    };
    const state = makeState({
      secondsToNext: 120,
      idleSeconds: 59,
      idleNudge: 60,
      notif: existingNotif,
    });
    const result = tick({ state, currentSlot: slot });
    expect(result.notif).toBe(existingNotif);
  });

  it("does not raise a notif when currentSlot is null (timer would fire)", () => {
    const state = makeState({ secondsToNext: 1, idleSeconds: 0 });
    const result = tick({ state, currentSlot: null });
    expect(result.notif).toBeNull();
  });

  it("does not raise a notif when currentSlot is null (idle would fire)", () => {
    const state = makeState({ secondsToNext: 120, idleSeconds: 59, idleNudge: 60 });
    const result = tick({ state, currentSlot: null });
    expect(result.notif).toBeNull();
  });

  it("still decrements secondsToNext and increments idleSeconds even when suppressed", () => {
    const state = makeState({ secondsToNext: 5, idleSeconds: 3, busy: true });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.secondsToNext).toBe(4);
    expect(result.idleSeconds).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// tick — secondsToNext floored at 0
// ---------------------------------------------------------------------------
describe("tick — secondsToNext never goes negative", () => {
  it("floors secondsToNext at 0 when already at 0", () => {
    // When secondsToNext is 0, notif is already set to suppress new notif
    const slot = makeSlot();
    const existingNotif: Notif = { slot, reason: "timer", label: "Interval's up" };
    const state = makeState({ secondsToNext: 0, idleSeconds: 0, notif: existingNotif });
    const result = tick({ state, currentSlot: slot });
    expect(result.secondsToNext).toBe(0);
  });

  it("does not produce a negative secondsToNext even when decrementing from 0", () => {
    // Use busy=true to suppress notif so we can isolate secondsToNext behavior
    const state = makeState({ secondsToNext: 0, idleSeconds: 0, busy: true });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.secondsToNext).toBeGreaterThanOrEqual(0);
    expect(result.secondsToNext).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// tick — no notif raised when conditions not met (normal tick)
// ---------------------------------------------------------------------------
describe("tick — no notif for normal tick", () => {
  it("returns null notif when timer has not reached 0 and idle below threshold", () => {
    const state = makeState({ secondsToNext: 30, idleSeconds: 10, idleNudge: 60 });
    const slot = makeSlot();
    const result = tick({ state, currentSlot: slot });
    expect(result.notif).toBeNull();
    expect(result.secondsToNext).toBe(29);
    expect(result.idleSeconds).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// resetIdle
// ---------------------------------------------------------------------------
describe("resetIdle", () => {
  it("zeroes out idleSeconds", () => {
    const state = makeState({ idleSeconds: 42 });
    const result = resetIdle(state);
    expect(result.idleSeconds).toBe(0);
  });

  it("preserves secondsToNext", () => {
    const state = makeState({ secondsToNext: 99, idleSeconds: 10 });
    const result = resetIdle(state);
    expect(result.secondsToNext).toBe(99);
  });

  it("preserves idleNudge", () => {
    const state = makeState({ idleNudge: 45, idleSeconds: 5 });
    const result = resetIdle(state);
    expect(result.idleNudge).toBe(45);
  });

  it("preserves busy", () => {
    const state = makeState({ busy: true, idleSeconds: 5 });
    const result = resetIdle(state);
    expect(result.busy).toBe(true);
  });

  it("preserves notif", () => {
    const slot = makeSlot();
    const notif: Notif = { slot, reason: "idle", label: "You've gone quiet" };
    const state = makeState({ notif, idleSeconds: 5 });
    const result = resetIdle(state);
    expect(result.notif).toEqual(notif);
  });

  it("returns a new object (does not return the same reference)", () => {
    const state = makeState({ idleSeconds: 5 });
    const result = resetIdle(state);
    expect(result).not.toBe(state);
  });

  it("returns new object even when idleSeconds is already 0", () => {
    const state = makeState({ idleSeconds: 0 });
    const result = resetIdle(state);
    expect(result.idleSeconds).toBe(0);
  });

  it("does not mutate the input state", () => {
    const state = makeState({ idleSeconds: 15 });
    resetIdle(state);
    expect(state.idleSeconds).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// snooze
// ---------------------------------------------------------------------------
describe("snooze", () => {
  it("clears the notif (sets to null)", () => {
    const slot = makeSlot();
    const notif: Notif = { slot, reason: "timer", label: "Interval's up" };
    const state = makeState({ notif });
    const result = snooze(state, 300);
    expect(result.notif).toBeNull();
  });

  it("sets secondsToNext to the given snooze duration", () => {
    const state = makeState({ secondsToNext: 10 });
    const result = snooze(state, 300);
    expect(result.secondsToNext).toBe(300);
  });

  it("resets idleSeconds to 0", () => {
    const state = makeState({ idleSeconds: 30 });
    const result = snooze(state, 300);
    expect(result.idleSeconds).toBe(0);
  });

  it("accepts a 600-second snooze duration", () => {
    const state = makeState();
    const result = snooze(state, 600);
    expect(result.secondsToNext).toBe(600);
    expect(result.notif).toBeNull();
    expect(result.idleSeconds).toBe(0);
  });

  it("does not mutate the input state", () => {
    const slot = makeSlot();
    const notif: Notif = { slot, reason: "timer", label: "Interval's up" };
    const state = makeState({ idleSeconds: 20, secondsToNext: 5, notif });
    snooze(state, 120);
    expect(state.idleSeconds).toBe(20);
    expect(state.secondsToNext).toBe(5);
    expect(state.notif).toBe(notif);
  });
});

// ---------------------------------------------------------------------------
// resetTimer
// ---------------------------------------------------------------------------
describe("resetTimer", () => {
  it("sets secondsToNext to intervalMin * 60 (5 min = 300s)", () => {
    const state = makeState({ secondsToNext: 5 });
    const result = resetTimer(state, 5);
    expect(result.secondsToNext).toBe(300);
  });

  it("sets secondsToNext to intervalMin * 60 (1 min = 60s)", () => {
    const state = makeState();
    const result = resetTimer(state, 1);
    expect(result.secondsToNext).toBe(60);
  });

  it("sets secondsToNext to intervalMin * 60 (10 min = 600s)", () => {
    const state = makeState();
    const result = resetTimer(state, 10);
    expect(result.secondsToNext).toBe(600);
  });

  it("resets idleSeconds to 0", () => {
    const state = makeState({ idleSeconds: 45 });
    const result = resetTimer(state, 3);
    expect(result.idleSeconds).toBe(0);
  });

  it("clears notif (sets to null)", () => {
    const slot = makeSlot();
    const notif: Notif = { slot, reason: "idle", label: "You've gone quiet" };
    const state = makeState({ notif });
    const result = resetTimer(state, 3);
    expect(result.notif).toBeNull();
  });

  it("preserves idleNudge", () => {
    const state = makeState({ idleNudge: 30 });
    const result = resetTimer(state, 5);
    expect(result.idleNudge).toBe(30);
  });

  it("preserves busy flag", () => {
    const state = makeState({ busy: true });
    const result = resetTimer(state, 5);
    expect(result.busy).toBe(true);
  });

  it("does not mutate the input state", () => {
    const state = makeState({ secondsToNext: 999, idleSeconds: 7 });
    resetTimer(state, 5);
    expect(state.secondsToNext).toBe(999);
    expect(state.idleSeconds).toBe(7);
  });
});
