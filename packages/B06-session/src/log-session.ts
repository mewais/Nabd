import type { LoggedSet, Trigger } from "@nabd/domain";
import { SECONDS_STEP, dateKey, isTimeBased, isWeighted, musclesOf, roundKg } from "@nabd/domain";
import type { PlanItem } from "@nabd/scheduling";
import type { Performance } from "@nabd/progression";

/** What a draft holds; see {@link LogSession} for each field. */
interface Draft {
  itemId: string;
  reps: number;
  weight: number;
  trigger: Trigger;
  restUntil: Date | null;
}

/**
 * An immutable draft of one set: which exercise, the reps (or seconds) and load
 * about to be logged, what prompted the session, and any rest still running.
 */
export class LogSession {
  /** The plan item being logged against. */
  readonly itemId: string;
  /** Reps, or seconds for time-based exercises. */
  readonly reps: number;
  /** Load in kg (ignored for unweighted exercises). */
  readonly weight: number;
  readonly trigger: Trigger;
  /** Rest after the previous set runs until this time. */
  readonly restUntil: Date | null;

  private constructor(draft: Draft) {
    this.itemId = draft.itemId;
    this.reps = draft.reps;
    this.weight = draft.weight;
    this.trigger = draft.trigger;
    this.restUntil = draft.restUntil;
  }

  private with(patch: Partial<Draft>): LogSession {
    return new LogSession({ ...this, ...patch });
  }

  /** Open a session on `item`, pre-filled with `start`. */
  static open(item: PlanItem, start: Performance, trigger: Trigger): LogSession {
    const { reps, weight } = start;
    return new LogSession({ itemId: item.id, reps, weight: weight ?? 0, trigger, restUntil: null });
  }

  /** Move to another exercise, keeping the trigger and any running rest. */
  focus(item: PlanItem, start: Performance): LogSession {
    return this.with({ itemId: item.id, reps: start.reps, weight: start.weight ?? 0 });
  }

  withReps(reps: number): LogSession {
    return Number.isFinite(reps) ? this.with({ reps: Math.max(1, Math.floor(reps)) }) : this;
  }

  withWeight(kg: number): LogSession {
    return Number.isFinite(kg) ? this.with({ weight: Math.max(0, roundKg(kg)) }) : this;
  }

  /** Nudge reps by `direction` (±1); time-based exercises move in steps of seconds. */
  stepReps(item: PlanItem, direction: number): LogSession {
    const step = isTimeBased(item.exercise.tracking) ? SECONDS_STEP : 1;
    return this.withReps(this.reps + direction * step);
  }

  stepWeight(direction: number, stepKg: number): LogSession {
    return this.withWeight(this.weight + direction * stepKg);
  }

  /** Start resting for `seconds` from `now`. */
  resting(now: Date, seconds: number): LogSession {
    return this.with({
      restUntil: seconds > 0 ? new Date(now.getTime() + seconds * 1000) : null,
    });
  }

  /** The draft as it should be recorded for `item`. */
  performance(item: PlanItem): Performance {
    return { reps: this.reps, weight: isWeighted(item.exercise.tracking) ? this.weight : null };
  }

  /** The history row for this draft, logged against `item` at `at`. */
  toLoggedSet(item: PlanItem, id: string, at: Date): LoggedSet {
    const { exercise } = item;
    const { reps, weight } = this.performance(item);
    return {
      id,
      exId: exercise.id,
      exercise: exercise.name,
      group: exercise.group,
      muscles: musclesOf(exercise),
      value: reps,
      weight,
      ts: at.toISOString(),
      date: dateKey(at),
      trigger: this.trigger,
      planItemId: item.id,
      setType: item.nextSet?.type ?? "working",
    };
  }

  /** Whole seconds of rest left at `now`. */
  restRemaining(now: Date): number {
    if (this.restUntil === null) return 0;
    return Math.max(0, Math.ceil((this.restUntil.getTime() - now.getTime()) / 1000));
  }
}
