import type {
  Day,
  DayRecord,
  DayState,
  Exercise,
  LoggedSet,
  MuscleKey,
  Prescription,
  Program,
  RotationState,
} from "@nabd/domain";
import { MUSCLE_NAMES, dateKey } from "@nabd/domain";
import { floatingDay } from "./floating";
import { PlanItem } from "./plan-item";
import { TodaysSets } from "./todays-sets";

export type ExerciseLookup = (exId: string) => Exercise | undefined;

export interface TodayPlanInput {
  program: Program;
  date: Date;
  dayState: DayState;
  rotation: RotationState;
  /** Full history; only sets logged on `date` are attributed. */
  history: readonly LoggedSet[];
  lookup: ExerciseLookup;
}

/** Which program day applies on `date`: by weekday, or the current floating day. */
export function resolveDay(program: Program, date: Date, dayId: string | null): Day | null {
  if (program.schedule === "weekday") {
    return program.days.find((d) => d.weekday === date.getDay()) ?? null;
  }
  return floatingDay(program, dayId);
}

/** The exercise a cycled pool is currently pointing at. */
export function rotatedExercise(
  slotId: string,
  pool: readonly string[],
  rotation: RotationState,
): string | null {
  return pool[(rotation[slotId] ?? 0) % pool.length] ?? null;
}

/** Item-id prefix for sets that count toward nothing in the plan (see {@link TodayPlan.build}). */
const UNPLANNED = "unplanned:";

/** One line of the queue before its exercise is looked up. */
interface Entry {
  id: string;
  exId: string;
  /** Replaces the exercise's group as the heading (a cycled slot's target muscle). */
  label?: string;
  prescription: Prescription | null;
  supersetId?: string;
  logged: LoggedSet[];
}

const sum = <T>(list: readonly T[], amount: (element: T) => number): number =>
  list.reduce((total, element) => total + amount(element), 0);

/** The day's prescribed lines, each with the sets logged against it. */
function plannedEntries(
  program: Program,
  day: Day | null,
  rotation: RotationState,
  sets: TodaysSets,
): { entries: Entry[]; emptySlots: MuscleKey[] } {
  const entries: Entry[] = [];
  const emptySlots: MuscleKey[] = [];
  if (day === null) return { entries, emptySlots };
  if (program.type === "fixed") {
    for (const row of day.exercises) {
      const { id, exId, supersetId } = row;
      entries.push({ id, exId, supersetId, prescription: row, logged: sets.loggedAgainst(id) });
    }
    return { entries, emptySlots };
  }
  for (const slot of day.slots) {
    const logged = sets.loggedAgainst(slot.id);
    // Once trained today a slot stays on that exercise, whatever happens to its pool.
    const exId = logged[0]?.exId ?? rotatedExercise(slot.id, slot.pool, rotation);
    if (exId === null) emptySlots.push(slot.muscle);
    else {
      const label = MUSCLE_NAMES[slot.muscle];
      entries.push({ id: slot.id, exId, label, prescription: slot, logged });
    }
  }
  return { entries, emptySlots };
}

/**
 * Today's queue, derived on demand from the program, the rotation and today's
 * logged sets — never stored — so plan edits and logged sets always show up.
 */
export class TodayPlan {
  private constructor(
    readonly date: string,
    readonly dayName: string | null,
    readonly items: readonly PlanItem[],
    /** Muscles of cycled slots that cannot be trained yet: their pool is empty. */
    readonly emptySlots: readonly MuscleKey[],
  ) {}

  static readonly empty = new TodayPlan("", null, [], []);

  /**
   * Every set logged today counts somewhere, even after the plan changed under
   * it (plan type switched, exercise removed or replaced): a set whose plan item
   * is gone moves to an untouched item of the same exercise, and failing that is
   * listed as an unplanned exercise, so the totals never lose work that was done.
   */
  static build(input: TodayPlanInput): TodayPlan {
    const { program, date, dayState, rotation, history, lookup } = input;
    const today = dateKey(date);
    const sets = new TodaysSets(history.filter((set) => set.date === today));
    const day = resolveDay(program, date, dayState.dayId);

    const { entries, emptySlots } = plannedEntries(program, day, rotation, sets);
    for (const extra of dayState.extras) {
      entries.push({ ...extra, prescription: null, logged: sets.loggedAgainst(extra.id) });
    }
    for (const entry of entries) {
      if (entry.logged.length === 0) entry.logged = sets.ofExercise(entry.exId);
    }
    for (const exId of sets.unclaimedExercises) {
      entries.push({ id: UNPLANNED + exId, exId, prescription: null, logged: sets.ofExercise(exId) });
    }

    const items = entries.flatMap(({ exId, label, ...entry }) => {
      const exercise = lookup(exId);
      if (!exercise) return [];
      const skipped = dayState.skipped.includes(entry.id);
      return [new PlanItem({ ...entry, exercise, label: label ?? exercise.group, skipped })];
    });
    return new TodayPlan(today, day?.name ?? null, items, emptySlots);
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
   */
  get record(): DayRecord | null {
    const planned = sum(this.items, (i) => i.planned);
    if (planned === 0) return null;
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
   * Where to go after logging a set of `itemId`: the superset partner that is
   * furthest behind, else the same exercise while it owes sets, else the next
   * exercise in the queue. Null when the day is finished.
   */
  focusAfter(itemId: string): PlanItem | null {
    const current = this.item(itemId);
    if (current?.supersetId !== undefined) {
      const partner = this.items
        .filter((i) => i.supersetId === current.supersetId && i.id !== itemId && i.remaining > 0)
        .sort((a, b) => a.done - b.done)[0];
      if (partner && partner.done <= current.done) return partner;
    }
    if (current && (current.remaining > 0 || current.isExtra)) return current;
    return this.nextItem;
  }
}
