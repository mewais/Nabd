// @nabd/session — the set currently being entered in the logging modal.

import type { Trigger } from "@nabd/domain";
import { isTimeBased, isWeighted } from "@nabd/domain";
import type { PlanItem } from "@nabd/scheduling";
import type { Performance } from "@nabd/progression";

const SECONDS_STEP = 5;
const roundKg = (kg: number): number => Math.round(kg * 1000) / 1000;

/**
 * An immutable draft of one set: which exercise, the reps (or seconds) and load
 * about to be logged, what prompted the session, and any rest still running.
 */
export class LogSession {
  private constructor(
    readonly itemId: string,
    /** Reps, or seconds for time-based exercises. */
    readonly reps: number,
    /** Load in kg (ignored for unweighted exercises). */
    readonly weight: number,
    readonly trigger: Trigger,
    /** Rest after the previous set runs until this time. */
    readonly restUntil: Date | null,
  ) {}

  /** Open a session on `item`, pre-filled with `start`. */
  static open(item: PlanItem, start: Performance, trigger: Trigger): LogSession {
    return new LogSession(item.id, start.reps, start.weight ?? 0, trigger, null);
  }

  /** Move to another exercise, keeping the trigger and any running rest. */
  focus(item: PlanItem, start: Performance): LogSession {
    return new LogSession(item.id, start.reps, start.weight ?? 0, this.trigger, this.restUntil);
  }

  withReps(reps: number): LogSession {
    const value = Number.isFinite(reps) ? Math.max(1, Math.floor(reps)) : this.reps;
    return new LogSession(this.itemId, value, this.weight, this.trigger, this.restUntil);
  }

  withWeight(kg: number): LogSession {
    const value = Number.isFinite(kg) ? Math.max(0, roundKg(kg)) : this.weight;
    return new LogSession(this.itemId, this.reps, value, this.trigger, this.restUntil);
  }

  /** Nudge reps by `direction` (±1); time-based exercises move in 5 s steps. */
  stepReps(item: PlanItem, direction: number): LogSession {
    const step = isTimeBased(item.exercise.tracking) ? SECONDS_STEP : 1;
    return this.withReps(this.reps + direction * step);
  }

  stepWeight(direction: number, stepKg: number): LogSession {
    return this.withWeight(this.weight + direction * stepKg);
  }

  /** Start resting for `seconds` from `now`. */
  resting(now: Date, seconds: number): LogSession {
    const until = seconds > 0 ? new Date(now.getTime() + seconds * 1000) : null;
    return new LogSession(this.itemId, this.reps, this.weight, this.trigger, until);
  }

  /** The draft as it should be recorded for `item`. */
  performance(item: PlanItem): Performance {
    return { reps: this.reps, weight: isWeighted(item.exercise.tracking) ? this.weight : null };
  }

  /** Whole seconds of rest left at `now`. */
  restRemaining(now: Date): number {
    if (this.restUntil === null) return 0;
    return Math.max(0, Math.ceil((this.restUntil.getTime() - now.getTime()) / 1000));
  }
}
