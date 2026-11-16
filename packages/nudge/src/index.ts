// @nabd/nudge — decides, from the wall clock, when the user should be told to move.

import type { Settings, Trigger } from "@nabd/domain";
import { addDays, atMinuteOfDay, formatClock, isWorkDay, weekdayShort } from "@nabd/domain";

/** How long a snoozed nudge stays quiet, in minutes. */
export const SNOOZE_MINUTES = 5;

/** What can prompt a nudge: every trigger of a set except the user's own initiative. */
type NudgeReason = Exclude<Trigger, "manual">;

/** Everything the policy needs to know about the moment. */
export interface NudgeContext {
  now: Date;
  /** When the last set was logged today, if any. */
  lastSetAt: Date | null;
  /**
   * Since when there has been something to nudge about: the app was launched,
   * or the plan gained work. Counting never starts earlier, so opening the app
   * (or building a plan) mid-day does not owe a nudge for the whole morning.
   */
  activeSince: Date | null;
  /** Nudges are silenced until this time (snooze / dismissal). */
  snoozedUntil: Date | null;
  /** Seconds since the last keyboard/mouse input. */
  idleSeconds: number;
  /** The user paused nudges. */
  paused: boolean;
  /** There is at least one prescribed set left today. */
  hasWork: boolean;
}

export type NudgeStatus =
  /** A set is due right now. */
  | { state: "due"; reason: NudgeReason }
  /** Counting down; the timer fires at `at` unless an idle moment comes first. */
  | { state: "waiting"; at: Date; idleFrom: Date }
  /** Outside the workday, or on a day off; counting resumes at `at`, `inDays` calendar days from now. */
  | { state: "off_hours"; at: Date; inDays: number }
  | { state: "paused" }
  | { state: "nothing_left" };

/**
 * A nudge that has fired and not been answered yet. It is held rather than
 * recomputed, because "due" itself is fleeting: an idle nudge stops being due
 * the moment the user touches the mouse to answer it.
 */
export interface PendingNudge {
  reason: NudgeReason;
  since: Date;
  /**
   * When the user was last told about it. A nudge that goes unanswered is
   * renewed — a new object, with this moved on — once per `interval`, so
   * whoever shows it elsewhere (the desktop notification) can say it again.
   */
  remindedAt: Date;
}

type NudgeSettings = Pick<
  Settings,
  "interval" | "minGap" | "idleNudge" | "workStart" | "workEnd" | "workDays"
>;

const MS_PER_MINUTE = 60_000;
const DAYS_PER_WEEK = 7;
const later = (a: Date, b: Date | null): Date => (b !== null && b > a ? b : a);
const plusMinutes = (d: Date, minutes: number): Date =>
  new Date(d.getTime() + minutes * MS_PER_MINUTE);

/**
 * The nudge rules:
 *  - never outside the workday, on a day that is not a workday, while paused,
 *    or with nothing left to do;
 *  - the timer nudges `interval` minutes after the last set — or, before the first
 *    one, after the workday started or there first was work to do, whichever is later;
 *  - an idle moment nudges earlier, but never sooner than `minGap` minutes after it;
 *  - a snooze silences both until it expires;
 *  - a nudge that fired stays pending until it is answered, and is repeated once
 *    per `interval` while it waits.
 */
export class NudgePolicy {
  constructor(private readonly settings: NudgeSettings) {}

  evaluate(ctx: NudgeContext): NudgeStatus {
    const { now } = ctx;
    const { interval, minGap, idleNudge, workStart, workEnd } = this.settings;
    if (!ctx.hasWork) return { state: "nothing_left" };
    if (ctx.paused) return { state: "paused" };

    const opens = atMinuteOfDay(now, workStart);
    const closes = atMinuteOfDay(now, workEnd);
    if (!isWorkDay(this.settings, now) || now >= closes) return this.quietUntilNextWorkday(now);
    if (now < opens) return { state: "off_hours", at: opens, inDays: 0 };

    const since = later(later(opens, ctx.activeSince), ctx.lastSetAt);
    const timerAt = later(plusMinutes(since, interval), ctx.snoozedUntil);
    const idleFrom = later(plusMinutes(since, Math.min(minGap, interval)), ctx.snoozedUntil);

    if (now >= timerAt) return { state: "due", reason: "timer" };
    if (now >= idleFrom && ctx.idleSeconds >= idleNudge) return { state: "due", reason: "idle" };
    return { state: "waiting", at: timerAt, idleFrom };
  }

  /** Quiet until the workday starts on the next day that is one. */
  private quietUntilNextWorkday(now: Date): NudgeStatus {
    const ahead = Array.from({ length: DAYS_PER_WEEK }, (_, i) => i + 1).find((days) =>
      isWorkDay(this.settings, addDays(now, days)),
    );
    // Settings always keep a workday; without one, tomorrow is as good a guess as any.
    const inDays = ahead ?? 1;
    return {
      state: "off_hours",
      at: atMinuteOfDay(addDays(now, inDays), this.settings.workStart),
      inDays,
    };
  }

  /**
   * The pending nudge after the policy said `status` at `now`: a due set starts
   * one (the first reason sticks), counting down keeps it, and anything that
   * forbids nudging — off hours, pause, nothing left — withdraws it. One that
   * has waited a whole `interval` since the user was last told is renewed.
   */
  latch(pending: PendingNudge | null, status: NudgeStatus, now: Date): PendingNudge | null {
    if (status.state !== "due" && status.state !== "waiting") return null;
    if (pending === null) {
      return status.state === "due" ? { reason: status.reason, since: now, remindedAt: now } : null;
    }
    const remindAt = plusMinutes(pending.remindedAt, this.settings.interval);
    return now >= remindAt ? { ...pending, remindedAt: now } : pending;
  }

  /** When a snooze started at `now` expires. */
  static snoozeUntil(now: Date): Date {
    return plusMinutes(now, SNOOZE_MINUTES);
  }
}

/** When nudging resumes: "09:00" today or tomorrow, "Mon 09:00" further off. */
function resumes({ at, inDays }: { at: Date; inDays: number }): string {
  const clock = formatClock(at);
  return inDays > 1 ? `${weekdayShort(at.getDay())} ${clock}` : clock;
}

/** A one-line, human description of where nudging stands. */
export function describeNudge(status: NudgeStatus): string {
  switch (status.state) {
    case "due":
      return status.reason === "idle" ? "You've gone quiet" : "Interval's up";
    case "waiting":
      return `Next nudge at ${formatClock(status.at)}, sooner if you go idle`;
    case "off_hours":
      return `Quiet until ${resumes(status)}`;
    case "paused":
      return "Nudges paused";
    case "nothing_left":
      return "Nothing left today";
  }
}

/** Where nudging stands, ready to show. */
export interface NudgeSummary {
  /** {@link describeNudge}'s line. */
  line: string;
  /** A set is due right now. */
  due: boolean;
}

export function summarizeNudge(status: NudgeStatus): NudgeSummary {
  return { line: describeNudge(status), due: status.state === "due" };
}
