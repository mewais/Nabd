import type { Direction, LoggedSet, SetDay, TrackingType, Trigger } from "@nabd/domain";
import {
  MAX_AMOUNT,
  MAX_LOAD_KG,
  SECONDS_STEP,
  boundedLoad,
  clamp,
  isWeighted,
  loggedSet,
  measureOf,
  roundKg,
} from "@nabd/domain";
import type { PlanItem } from "@nabd/scheduling";
import type { Performance } from "@nabd/progression";

/** What a draft holds: the session's own fields (see {@link LogSession}). */
type Draft = Pick<LogSession, "itemId" | "tracking" | "reps" | "weight" | "trigger" | "restUntil">;

/**
 * An immutable draft of one set: which exercise, the reps (or seconds) and load
 * about to be logged, what prompted the session, and any rest still running.
 */
export class LogSession {
  /** The plan item being logged against. */
  declare readonly itemId: string;
  /** How that item's exercise is tracked: what the numbers below mean. */
  declare readonly tracking: TrackingType;
  /** Reps, or seconds for time-based exercises. */
  declare readonly reps: number;
  /** Load in kg (ignored for unweighted exercises). */
  declare readonly weight: number;
  declare readonly trigger: Trigger;
  /** Rest after the previous set runs until this time. */
  declare readonly restUntil: Date | null;

  private constructor(draft: Draft) {
    Object.assign(this, draft);
  }

  private with(patch: Partial<Draft>): LogSession {
    return new LogSession({ ...this, ...patch });
  }

  /** What pointing a draft at `item` sets, starting from `start`. */
  private static aimedAt(item: PlanItem, start: Performance): Partial<Draft> {
    return {
      itemId: item.id,
      tracking: item.exercise.tracking,
      reps: start.reps,
      weight: start.weight ?? 0,
    };
  }

  /** Open a session on `item`, pre-filled with `start`. */
  static open(item: PlanItem, start: Performance, trigger: Trigger): LogSession {
    const { tracking } = item.exercise;
    const blank = { itemId: item.id, tracking, reps: 1, weight: 0, trigger, restUntil: null };
    return new LogSession(blank).focus(item, start);
  }

  /** Move to another exercise, keeping the trigger and any running rest. */
  focus(item: PlanItem, start: Performance): LogSession {
    return this.with(LogSession.aimedAt(item, start));
  }

  /** The most reps (or seconds) a set of this exercise can record. */
  private get mostReps(): number {
    return MAX_AMOUNT[measureOf(this.tracking)];
  }

  /**
   * Reps (or seconds) as typed: whole, at least 1 and no more than a set can
   * record. Anything else is a slip of the keyboard and leaves the draft as it was.
   */
  withReps(reps: number): LogSession {
    const whole = Math.floor(reps);
    return whole >= 1 && whole <= this.mostReps ? this.with({ reps: whole }) : this;
  }

  /** A load as typed, from nothing up to the most a set can record; anything else is ignored. */
  withWeight(kg: number): LogSession {
    return kg >= 0 && kg <= MAX_LOAD_KG ? this.with({ weight: roundKg(kg) }) : this;
  }

  /** Step reps down or up by one; time-based exercises move in steps of seconds. */
  stepReps(direction: Direction): LogSession {
    const step = measureOf(this.tracking) === "time" ? SECONDS_STEP : 1;
    return this.withReps(clamp(this.reps + direction * step, 1, this.mostReps));
  }

  /**
   * Step the load down or up by `stepKg`, within the loads the exercise can be
   * given (see `boundedLoad`): a barbell or a dumbbell never steps below one
   * increment. A step the bounds would turn round (− from a load already
   * lighter than that) leaves the load as it is.
   */
  stepWeight(direction: Direction, stepKg: number): LogSession {
    const stepped = boundedLoad(this.weight + direction * stepKg, this.tracking, stepKg);
    return Math.sign(stepped - this.weight) === -direction ? this : this.withWeight(stepped);
  }

  /** Start resting for `seconds` from `now`. */
  resting(now: Date, seconds: number): LogSession {
    return this.with({
      restUntil: seconds > 0 ? new Date(now.getTime() + seconds * 1000) : null,
    });
  }

  /** The draft as it should be recorded. */
  get performance(): Performance {
    return { reps: this.reps, weight: isWeighted(this.tracking) ? this.weight : null };
  }

  /**
   * The history row for this draft: a set of `item` done at `at`, counting
   * toward the day that is open and belonging to its session (`day`).
   */
  toLoggedSet(item: PlanItem, id: string, at: Date, day: SetDay): LoggedSet {
    const { reps, weight } = this.performance;
    const details = {
      id,
      value: reps,
      weight,
      trigger: this.trigger,
      planItemId: item.id,
      setType: item.nextSet?.type ?? "working",
    };
    return loggedSet(item.exercise, at, details, day);
  }

  /** Whole seconds of rest left at `now`. */
  restRemaining(now: Date): number {
    if (this.restUntil === null) return 0;
    return Math.max(0, Math.ceil((this.restUntil.getTime() - now.getTime()) / 1000));
  }
}
