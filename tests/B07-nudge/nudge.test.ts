import { DEFAULT_SETTINGS, SNOOZE_MINUTES } from "@nabd/domain";
import { NudgePolicy, describeNudge } from "@nabd/nudge";
import type { NudgeContext } from "@nabd/nudge";
import { nov } from "../support/domain-factories";

// Workday 09:00–18:00, timer 50 min, minimum gap 15 min, idle after 30 s.
const policy = new NudgePolicy(DEFAULT_SETTINGS);

function at(hour: number, minute: number, overrides: Partial<NudgeContext> = {}) {
  return policy.evaluate({
    now: nov(16, hour, minute),
    lastSetAt: null,
    activeSince: null,
    snoozedUntil: null,
    idleSeconds: 0,
    paused: false,
    hasWork: true,
    ...overrides,
  });
}

describe("NudgePolicy", () => {
  it("stays silent outside the workday and says when it resumes", () => {
    expect(at(7, 0, { idleSeconds: 999 })).toEqual({ state: "off_hours", at: nov(16, 9) });
    expect(at(18, 0)).toEqual({ state: "off_hours", at: nov(17, 9) });
    expect(at(23, 30, { idleSeconds: 999 })).toEqual({ state: "off_hours", at: nov(17, 9) });
  });

  it("the timer counts from the start of the workday until a set is logged", () => {
    expect(at(9, 10)).toEqual({ state: "waiting", at: nov(16, 9, 50), idleFrom: nov(16, 9, 15) });
    expect(at(9, 50)).toEqual({ state: "due", reason: "timer" });
  });

  it("counting starts no earlier than the app (or the plan) was there to count", () => {
    // Launched at 14:00: no nudge is owed for the morning.
    const activeSince = nov(16, 14, 0);
    expect(at(14, 0, { activeSince, idleSeconds: 600 })).toEqual({
      state: "waiting",
      at: nov(16, 14, 50),
      idleFrom: nov(16, 14, 15),
    });
    expect(at(14, 50, { activeSince })).toEqual({ state: "due", reason: "timer" });
    // Launched before work: the workday start still rules.
    expect(at(9, 10, { activeSince: nov(16, 7, 0) })).toMatchObject({ at: nov(16, 9, 50) });
    // Once a set is logged, it is the anchor.
    expect(at(14, 30, { activeSince, lastSetAt: nov(16, 14, 20) })).toMatchObject({
      at: nov(16, 15, 10),
    });
  });

  it("the timer counts from the last set", () => {
    const lastSetAt = nov(16, 10, 0);
    expect(at(10, 49, { lastSetAt })).toMatchObject({ state: "waiting", at: nov(16, 10, 50) });
    expect(at(10, 50, { lastSetAt })).toEqual({ state: "due", reason: "timer" });
  });

  it("an idle moment nudges early, but never inside the minimum gap", () => {
    const lastSetAt = nov(16, 10, 0);
    expect(at(10, 14, { lastSetAt, idleSeconds: 600 }).state).toBe("waiting");
    expect(at(10, 15, { lastSetAt, idleSeconds: 29 }).state).toBe("waiting");
    expect(at(10, 15, { lastSetAt, idleSeconds: 30 })).toEqual({ state: "due", reason: "idle" });
  });

  it("the timer wins when both would fire", () => {
    expect(at(11, 0, { lastSetAt: nov(16, 10, 0), idleSeconds: 600 })).toEqual({
      state: "due",
      reason: "timer",
    });
  });

  it("a snooze silences both triggers until it expires", () => {
    const snoozedUntil = nov(16, 11, 5);
    const ctx = { lastSetAt: nov(16, 10, 0), snoozedUntil, idleSeconds: 600 };
    expect(at(11, 4, ctx)).toEqual({ state: "waiting", at: snoozedUntil, idleFrom: snoozedUntil });
    expect(at(11, 5, ctx)).toEqual({ state: "due", reason: "timer" });
  });

  it("snoozes for the configured number of minutes", () => {
    expect(NudgePolicy.snoozeUntil(nov(16, 11, 0))).toEqual(nov(16, 11, SNOOZE_MINUTES));
  });

  it("does nothing while paused or when no sets are left", () => {
    expect(at(12, 0, { paused: true })).toEqual({ state: "paused" });
    expect(at(12, 0, { hasWork: false })).toEqual({ state: "nothing_left" });
    expect(at(12, 0, { hasWork: false, paused: true })).toEqual({ state: "nothing_left" });
  });

  it("a minimum gap longer than the interval cannot delay the timer's own nudge", () => {
    const eager = new NudgePolicy({ ...DEFAULT_SETTINGS, interval: 10, minGap: 30 });
    const status = eager.evaluate({
      now: nov(16, 9, 10),
      lastSetAt: null,
      activeSince: null,
      snoozedUntil: null,
      idleSeconds: 0,
      paused: false,
      hasWork: true,
    });
    expect(status).toEqual({ state: "due", reason: "timer" });
  });
});

describe("a pending nudge", () => {
  const idle = { state: "due", reason: "idle" } as const;
  const waiting = { state: "waiting", at: nov(16, 11), idleFrom: nov(16, 10, 30) } as const;
  const pending = NudgePolicy.latch(null, idle, nov(16, 10, 40));

  it("starts when a set becomes due", () => {
    expect(pending).toEqual({ reason: "idle", since: nov(16, 10, 40) });
    expect(NudgePolicy.latch(null, waiting, nov(16, 10, 40))).toBeNull();
  });

  it("survives the user touching the mouse to answer it", () => {
    expect(NudgePolicy.latch(pending, waiting, nov(16, 10, 41))).toBe(pending);
  });

  it("keeps its first reason when the timer also comes due", () => {
    expect(NudgePolicy.latch(pending, { state: "due", reason: "timer" }, nov(16, 11))).toBe(
      pending,
    );
  });

  it("is withdrawn when nudging is not allowed any more", () => {
    for (const status of [
      { state: "paused" },
      { state: "nothing_left" },
      { state: "off_hours", at: nov(17, 9) },
    ] as const) {
      expect(NudgePolicy.latch(pending, status, nov(16, 18))).toBeNull();
    }
  });
});

describe("describeNudge", () => {
  it("puts each state into words", () => {
    expect(describeNudge({ state: "due", reason: "timer" })).toBe("Interval's up");
    expect(describeNudge({ state: "due", reason: "idle" })).toBe("You've gone quiet");
    expect(describeNudge({ state: "waiting", at: nov(16, 11, 40), idleFrom: nov(16, 11) })).toBe(
      "Next nudge at 11:40, sooner if you go idle",
    );
    expect(describeNudge({ state: "off_hours", at: nov(17, 9) })).toBe("Quiet until 09:00");
    expect(describeNudge({ state: "paused" })).toBe("Nudges paused");
    expect(describeNudge({ state: "nothing_left" })).toBe("Nothing left today");
  });
});
