import type {
  Day,
  DayState,
  ExerciseLookup,
  LoggedSet,
  MuscleKey,
  Program,
  RotationState,
  Settings,
} from "@nabd/domain";
import { NO_SETS, dateKey, exerciseOfSet, isFloating, isWorkday, sum } from "@nabd/domain";
import { DayLedger } from "./day-ledger";
import type { LedgerCalendar } from "./day-ledger";
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
  /** The weekdays that are worked: a day off owes nothing until a set is logged on it. */
  workDays: Settings["workDays"];
}

/**
 * Today's queue, derived on demand from the program, the rotation and today's
 * logged sets — never stored — so plan edits and logged sets always show up.
 */
export class TodayPlan {
  private constructor(
    readonly date: string,
    /**
     * The date an unfinished floating day that came back began on; null when
     * today's visit began today (and always on a weekday plan).
     */
    readonly continuesFrom: string | null,
    /** The session a set logged now belongs to (see `LoggedSet.session`). */
    readonly session: string,
    /** The program day that applies today; null on a rest day or with no plan. */
    private readonly day: Day | null,
    readonly items: readonly PlanItem[],
    /** Muscles of cycled slots that cannot be trained yet: their pool is empty. */
    readonly emptySlots: readonly MuscleKey[],
    calendar: LedgerCalendar,
  ) {
    this.ledger = new DayLedger(this, calendar);
  }

  /** What the day owed and what it did. */
  readonly ledger: DayLedger;

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
    const { program, date, dayState, rotation, history, lookup, workDays } = input;
    const today = dateKey(date);
    const logged = history.filter((set) => set.date === today);
    const sets = new TodaysSets(logged);
    const day = resolveDay(program, date, dayState.dayId);
    const floating = isFloating(program);
    // What earlier days did counts on a floating plan only: weekdays have no such memory.
    const visit = floating ? dayState.carried : null;

    const { entries, emptySlots } = queueEntries(program, day, rotation, dayState.extras, sets);

    const items = entries.flatMap(({ exId, label, ...entry }) => {
      const firstSet = entry.logged[0];
      const exercise = lookup(exId) ?? (firstSet ? exerciseOfSet(firstSet) : null);
      if (!exercise) return [];
      const skipped = dayState.skipped.includes(entry.id);
      // What was done counts for the exercise it was done on, not for whatever the slot gives now.
      const earlier = visit?.items[entry.id];
      const carried = earlier?.exId === exercise.id ? earlier.sets : NO_SETS;
      const init = { ...entry, exercise, label: label ?? exercise.group, carried, skipped };
      return [new PlanItem(init)];
    });
    const continuesFrom = visit?.startedOn ?? null;
    // A set logged while a floating visit continues belongs to the session it began in; any
    // other — on a weekday plan, or on a floating day begun today — to today's own.
    const session = continuesFrom ?? today;
    const calendar = { floating, workday: isWorkday({ workDays }, date) };
    return new TodayPlan(today, continuesFrom, session, day, items, emptySlots, calendar);
  }

  item(id: string): PlanItem | undefined {
    return this.items.find((i) => i.id === id);
  }

  /** Prescribed sets this day owes, skipped items included: what it is on record against. */
  get setsOwed(): number {
    return sum(this.items, (i) => i.owed);
  }

  /** Prescribed sets this day owes across items that were not skipped. */
  get setsPlanned(): number {
    return sum(this.items, (i) => (i.skipped ? 0 : i.owed));
  }

  /** Sets logged today, whatever they count toward. */
  get setsDone(): number {
    return sum(this.items, (i) => i.logged.length);
  }

  get setsRemaining(): number {
    return sum(this.items, (i) => i.remaining);
  }

  /** Owed sets already logged today; sets beyond a prescription do not count. */
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

  /** Everything prescribed has been done (and something actually was, today or on an earlier day). */
  get isComplete(): boolean {
    return this.setsRemaining === 0 && this.items.some((i) => i.done > 0);
  }

  /** There is a plan for today, but every exercise in it was skipped. */
  get isAllSkipped(): boolean {
    const planned = this.items.filter((i) => !i.isExtra);
    return planned.length > 0 && planned.every((i) => i.skipped);
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
