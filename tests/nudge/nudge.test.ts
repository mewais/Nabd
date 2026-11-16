import { DEFAULT_SETTINGS } from "@nabd/domain";
import { NudgePolicy, SNOOZE_MINUTES, describeNudge, summarizeNudge } from "@nabd/nudge";
import type { NudgeContext } from "@nabd/nudge";
import { nov } from "../support/builders";

// Workday 09:00–18:00, timer 50 min, minimum gap 15 min, idle after 30 s.
const policy = new NudgePolicy(DEFAULT_SETTINGS);

const baseContext: NudgeContext = {
  now: nov(16, 9),
  lastSetAt: null,
  activeSince: null,
  snoozedUntil: null,
  idleSeconds: 0,
  paused: false,
  hasWork: true,
};

function evaluateAt(now: Date, overrides: Partial<NudgeContext> = {}) {
  return policy.evaluate({ ...baseContext, now, ...overrides });
}

/** The policy's verdict on Monday 16 Nov 2026 at `hour:minute`. */
const at = (hour: number, minute: number, overrides: Partial<NudgeContext> = {}) =>
  evaluateAt(nov(16, hour, minute), overrides);

describe("NudgePolicy", () => {
  it("stays silent outside the workday and says when it resumes", () => {
    expect(at(7, 0, { idleSeconds: 999 })).toEqual({
      state: "off_hours",
      at: nov(16, 9),
      inDays: 0,
    });
    expect(at(18, 0)).toEqual({ state: "off_hours", at: nov(17, 9), inDays: 1 });
    expect(at(23, 30, { idleSeconds: 999 })).toEqual({
      state: "off_hours",
      at: nov(17, 9),
      inDays: 1,
    });
  });

  describe("workdays", () => {
    const FRIDAY = 20;
    const SATURDAY = 21;
    const SUNDAY = 22;
    const onDay = (day: number, hour: number, overrides: Partial<NudgeContext> = {}) =>
      evaluateAt(nov(day, hour), { idleSeconds: 999, ...overrides });

    it("never nudges on a day that is not a workday, however long the user has been idle", () => {
      expect(onDay(SATURDAY, 12)).toEqual({ state: "off_hours", at: nov(23, 9), inDays: 2 });
      expect(onDay(SUNDAY, 12)).toEqual({ state: "off_hours", at: nov(23, 9), inDays: 1 });
      expect(onDay(SATURDAY, 12, { lastSetAt: nov(SATURDAY, 8) }).state).toBe("off_hours");
    });

    it("after the last workday ends, stays quiet until the next one starts", () => {
      expect(onDay(FRIDAY, 19)).toEqual({ state: "off_hours", at: nov(23, 9), inDays: 3 });
      expect(onDay(FRIDAY, 8)).toEqual({ state: "off_hours", at: nov(FRIDAY, 9), inDays: 0 });
    });

    it("follows the chosen days, even a single one, and resumes a week on from that very day", () => {
      const saturdays = new NudgePolicy({ ...DEFAULT_SETTINGS, workDays: [6] });
      const on = (day: number, hour: number) =>
        saturdays.evaluate({ ...baseContext, now: nov(day, hour) });
      expect(on(SATURDAY, 9).state).toBe("waiting");
      expect(on(SATURDAY, 19)).toEqual({ state: "off_hours", at: nov(28, 9), inDays: 7 });
      expect(on(16, 10)).toEqual({ state: "off_hours", at: nov(SATURDAY, 9), inDays: 5 });
    });

    it("still reports a paused day or one with nothing left before the day off", () => {
      expect(onDay(SATURDAY, 12, { paused: true })).toEqual({ state: "paused" });
      expect(onDay(SATURDAY, 12, { hasWork: false })).toEqual({ state: "nothing_left" });
    });
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
    const status = eager.evaluate({ ...baseContext, now: nov(16, 9, 10) });
    expect(status).toEqual({ state: "due", reason: "timer" });
  });
});

describe("a pending nudge", () => {
  const idle = { state: "due", reason: "idle" } as const;
  const waiting = { state: "waiting", at: nov(16, 11), idleFrom: nov(16, 10, 30) } as const;
  const pending = policy.latch(null, idle, nov(16, 10, 40));

  it("starts when a set becomes due", () => {
    expect(pending).toEqual({
      reason: "idle",
      since: nov(16, 10, 40),
      remindedAt: nov(16, 10, 40),
    });
    expect(policy.latch(null, waiting, nov(16, 10, 40))).toBeNull();
  });

  it("survives the user touching the mouse to answer it", () => {
    expect(policy.latch(pending, waiting, nov(16, 10, 41))).toBe(pending);
  });

  it("keeps its first reason when the timer also comes due", () => {
    expect(policy.latch(pending, { state: "due", reason: "timer" }, nov(16, 11))).toBe(pending);
  });

  it("is renewed once per interval for as long as it goes unanswered", () => {
    // The interval is 50 minutes: nothing new at 11:29, a reminder at 11:30, the next at 12:20.
    expect(policy.latch(pending, waiting, nov(16, 11, 29))).toBe(pending);
    const reminded = policy.latch(pending, waiting, nov(16, 11, 30));
    expect(reminded).not.toBe(pending);
    expect(reminded).toEqual({ ...pending, remindedAt: nov(16, 11, 30) });
    expect(policy.latch(reminded, waiting, nov(16, 12, 19))).toBe(reminded);
    expect(policy.latch(reminded, waiting, nov(16, 12, 20))).toEqual({
      ...pending,
      remindedAt: nov(16, 12, 20),
    });
  });

  it("is withdrawn when nudging is not allowed any more", () => {
    for (const status of [
      { state: "paused" },
      { state: "nothing_left" },
      { state: "off_hours", at: nov(17, 9), inDays: 1 },
    ] as const) {
      expect(policy.latch(pending, status, nov(16, 18))).toBeNull();
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
    expect(describeNudge({ state: "off_hours", at: nov(17, 9), inDays: 1 })).toBe(
      "Quiet until 09:00",
    );
    expect(describeNudge({ state: "off_hours", at: nov(23, 9), inDays: 2 })).toBe(
      "Quiet until Mon 09:00",
    );
    expect(describeNudge({ state: "paused" })).toBe("Nudges paused");
    expect(describeNudge({ state: "nothing_left" })).toBe("Nothing left today");
  });
});

describe("summarizeNudge", () => {
  it("pairs the status line with whether a set is due", () => {
    expect(summarizeNudge({ state: "due", reason: "idle" })).toEqual({
      line: "You've gone quiet",
      due: true,
    });
    expect(summarizeNudge({ state: "paused" })).toEqual({ line: "Nudges paused", due: false });
  });
});
