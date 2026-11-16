import type {
  Day,
  DayRecord,
  DayState,
  ExerciseLookup,
  LoggedSet,
  MuscleKey,
  Program,
  RotationState,
  Schedule,
} from "@nabd/domain";
import { dateKey, exerciseOfSet } from "@nabd/domain";
import { queueEntries, resolveDay } from "./queue-entries";
import { PlanItem } from "./plan-item";
import { TodaysSets } from "./todays-sets";

export interface TodayPlanInput {
  program: Program;
  date: Date;
  dayState: DayState;
  rotation: RotationState;
  /** Full history; only sets logged on `date` are attributed. */
  history: readonly LoggedSet[];
  lookup: ExerciseLookup;
}

const sum = <T>(list: readonly T[], amount: (element: T) => number): number =>
  list.reduce((total, element) => total + amount(element), 0);

/**
 * Today's queue, derived on demand from the program, the rotation and today's
 * logged sets — never stored — so plan edits and logged sets always show up.
 */
export class TodayPlan {
  private constructor(
    readonly date: string,
    /** The program day that applies today; null on a rest day or with no plan. */
    private readonly day: Day | null,
    /** Whether the plan follows the calendar (weekdays) or its own order (floating). */
    private readonly schedule: Schedule,
    readonly items: readonly PlanItem[],
    /** Muscles of cycled slots that cannot be trained yet: their pool is empty. */
    readonly emptySlots: readonly MuscleKey[],
  ) {}

  get dayId(): string | null {
    return this.day?.id ?? null;
  }

  get dayName(): string | null {
    return this.day?.name ?? null;
  }

  /**
   * Every set logged today counts somewhere, even after the plan changed under
   * it (plan type switched, exercise removed or replaced): a set whose plan item
   * is gone moves to an untouched item of the same exercise, and failing that is
   * listed as an unplanned exercise, so the totals never lose work that was done.
   * That holds even for an exercise since deleted from the library, which is
   * then shown as its sets recorded it.
   */
  static build(input: TodayPlanInput): TodayPlan {
    const { program, date, dayState, rotation, history, lookup } = input;
    const today = dateKey(date);
    const sets = new TodaysSets(history.filter((set) => set.date === today));
    const day = resolveDay(program, date, dayState.dayId);

    const { entries, emptySlots } = queueEntries(program, day, rotation, dayState.extras, sets);

    const items = entries.flatMap(({ exId, label, ...entry }) => {
      const firstSet = entry.logged[0];
      const exercise = lookup(exId) ?? (firstSet ? exerciseOfSet(firstSet) : null);
      if (!exercise) return [];
      const skipped = dayState.skipped.includes(entry.id);
      return [new PlanItem({ ...entry, exercise, label: label ?? exercise.group, skipped })];
    });
    return new TodayPlan(today, day, program.schedule, items, emptySlots);
  }

  item(id: string): PlanItem | undefined {
    return this.items.find((i) => i.id === id);
  }

  /** Prescribed sets across items that were not skipped. */
  get setsPlanned(): number {
    return sum(this.items, (i) => (i.skipped ? 0 : i.planned));
  }

  get setsDone(): number {
    return sum(this.items, (i) => i.done);
  }

  get setsRemaining(): number {
    return sum(this.items, (i) => i.remaining);
  }

  /** Prescribed sets already logged; sets beyond a prescription do not count. */
  get plannedSetsDone(): number {
    return this.setsPlanned - this.setsRemaining;
  }

  /** There is at least one prescribed set left to do today. */
  get hasWork(): boolean {
    return this.setsRemaining > 0;
  }

  /** Load moved today, in kg: reps × weight, warm-ups left out. */
  get loadLifted(): number {
    return sum(this.items, (i) => i.loadLifted);
  }

  /** Everything prescribed has been logged (and something actually was). */
  get isComplete(): boolean {
    return this.setsRemaining === 0 && this.setsDone > 0;
  }

  /** There is a plan for today, but every exercise in it was skipped. */
  get isAllSkipped(): boolean {
    const planned = this.items.filter((i) => !i.isExtra);
    return planned.length > 0 && planned.every((i) => i.skipped);
  }

  /**
   * How the day stands against its plan, for the completion charts; null when
   * nothing was planned. A skipped exercise still counts as planned, while
   * extras and sets beyond a prescription earn nothing: only planned work can
   * complete a plan.
   *
   * A floating plan has no calendar to fall behind: a day it sat idle is not a
   * missed day, so it has no record either until a set is logged or — `closed`
   * — the plan has moved on from it.
   */
  record(closed = false): DayRecord | null {
    const planned = sum(this.items, (i) => i.planned);
    if (planned === 0) return null;
    if (this.schedule === "floating" && this.setsDone === 0 && !closed) return null;
    return {
      date: this.date,
      planned,
      done: sum(this.items, (i) => Math.min(i.done, i.planned)),
    };
  }

  /** The first exercise that still owes a set. */
  get nextItem(): PlanItem | null {
    return this.items.find((i) => i.remaining > 0) ?? null;
  }

  /**
   * Where to go after logging a set of `itemId`. A set beyond the exercise's
   * prescription (an extra, or more of a finished exercise) was the user's own
   * choice, so the form stays there. Otherwise: the superset partner that is
   * furthest behind, else the same exercise while it owes sets, else the next
   * exercise in the queue. Null when the day is finished.
   */
  focusAfter(itemId: string): PlanItem | null {
    const current = this.item(itemId);
    if (current && current.done > current.planned) return current;
    if (current?.supersetId !== undefined) {
      const partner = this.items
        .filter((i) => i.supersetId === current.supersetId && i.id !== itemId && i.remaining > 0)
        .sort((a, b) => a.done - b.done)[0];
      if (partner && partner.done <= current.done) return partner;
    }
    return current && current.remaining > 0 ? current : this.nextItem;
  }
}
