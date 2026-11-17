// When the user should be told to move, decided from the wall clock.

import type { DayOverride, Settings, TodayChoice, Trigger } from "@nabd/domain";
import { DAYS_PER_WEEK, addDays, atMinuteOfDay, isWorkday } from "@nabd/domain";

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
   * the plan gained work, or nudging was asked for on a day that was quiet.
   * Counting never starts earlier, so opening the app (or building a plan)
   * mid-day does not owe a nudge for the whole morning.
   */
  activeSince: Date | null;
  /** Nudges are silenced until this time (snooze / dismissal). */
  snoozedUntil: Date | null;
  /** Seconds since the last keyboard/mouse input. */
  idleSeconds: number;
  /** The user paused nudges. */
  paused: boolean;
  /** Today was skipped, or nudged on outside the workday (see `DayState.override`). */
  override: DayOverride | null;
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
  /** Today was skipped: quiet until tomorrow. */
  | { state: "skipped" }
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
const later = (a: Date, b: Date | null): Date => (b !== null && b > a ? b : a);
const plusMinutes = (d: Date, minutes: number): Date =>
  new Date(d.getTime() + minutes * MS_PER_MINUTE);

/**
 * The nudge rules:
 *  - never outside the workday, on a day that is not a workday, on a day that
 *    was skipped, while paused, or with nothing left to do — but a day nudged
 *    on is nudged whatever the workday settings say;
 *  - the timer nudges `interval` minutes after the last set — or, before the first
 *    one, after the workday started or there first was work to do, whichever is later
 *    (on a day nudged on, after there was work and nudging was asked for);
 *  - an idle moment nudges earlier, but never sooner than `minGap` minutes after the
 *    moment the timer counts from;
 *  - a snooze silences both until it expires;
 *  - a nudge that fired stays pending until it is answered, and is repeated once
 *    per `interval` while it waits.
 */
export class NudgePolicy {
  constructor(private readonly settings: NudgeSettings) {}

  evaluate(ctx: NudgeContext): NudgeStatus {
    const { now } = ctx;
    const { interval, minGap, idleNudge } = this.settings;
    if (!ctx.hasWork) return { state: "nothing_left" };
    if (ctx.override === "skipped") return { state: "skipped" };
    if (ctx.paused) return { state: "paused" };

    const nudged = ctx.override === "nudged";
    const quiet = nudged ? null : this.quietAt(now);
    if (quiet !== null) return quiet;

    // A day nudged on counts from when it was (activeSince), not from the workday's start.
    const start = nudged ? (ctx.activeSince ?? now) : later(this.opens(now), ctx.activeSince);
    const since = later(start, ctx.lastSetAt);
    const timerAt = later(plusMinutes(since, interval), ctx.snoozedUntil);
    const idleFrom = later(plusMinutes(since, Math.min(minGap, interval)), ctx.snoozedUntil);

    if (now >= timerAt) return { state: "due", reason: "timer" };
    if (now >= idleFrom && ctx.idleSeconds >= idleNudge) return { state: "due", reason: "idle" };
    return { state: "waiting", at: timerAt, idleFrom };
  }

  /**
   * The one change to today's nudging the moment offers besides a pause: a
   * day skipped or nudged on can be taken back; otherwise a day that is quiet
   * by the workday settings (a day off, or outside the workday hours) can be
   * nudged on, and any other skipped.
   */
  todayChoice(now: Date, override: DayOverride | null): TodayChoice {
    if (override === "skipped") return "resume";
    if (override === "nudged") return "stop";
    return this.quietAt(now) === null ? "skip" : "nudge";
  }

  /** When the workday opens on the day of `now`. */
  private opens(now: Date): Date {
    return atMinuteOfDay(now, this.settings.workStart);
  }

  /** Off hours, if `now` is outside the workday or on a day off; null within it. */
  private quietAt(now: Date): NudgeStatus | null {
    const opens = this.opens(now);
    const closes = atMinuteOfDay(now, this.settings.workEnd);
    if (!isWorkday(this.settings, now) || now >= closes) return this.quietUntilNextWorkday(now);
    return now < opens ? { state: "off_hours", at: opens, inDays: 0 } : null;
  }

  /** Quiet until the workday starts on the next day that is one. */
  private quietUntilNextWorkday(now: Date): NudgeStatus {
    const ahead = Array.from({ length: DAYS_PER_WEEK }, (_, i) => i + 1).find((days) =>
      isWorkday(this.settings, addDays(now, days)),
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
   * forbids nudging — off hours, a skipped day, pause, nothing left — withdraws it. One that
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
