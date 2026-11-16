import type { Day, DayState, Exercise, LoggedSet, Program, RotationState } from "@nabd/domain";
import { MUSCLE_NAMES, dateKey } from "@nabd/domain";
import { PlanItem } from "./plan-item";

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

/** Which program day applies on `date`: by weekday, or by position for floating plans. */
export function resolveDay(program: Program, date: Date, floatingIndex: number): Day | null {
  if (program.schedule === "weekday") {
    return program.days.find((d) => d.weekday === date.getDay()) ?? null;
  }
  return program.days[floatingIndex % program.days.length] ?? null;
}

/** The exercise a cycled pool is currently pointing at. */
export function rotatedExercise(
  slotId: string,
  pool: readonly string[],
  rotation: RotationState,
): string | null {
  return pool[(rotation[slotId] ?? 0) % pool.length] ?? null;
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
  ) {}

  static readonly empty = new TodayPlan("", null, []);

  static build(input: TodayPlanInput): TodayPlan {
    const { program, date, dayState, rotation, history, lookup } = input;
    const today = dateKey(date);
    const loggedByItem = new Map<string, LoggedSet[]>();
    for (const set of history) {
      if (set.date !== today || set.planItemId === null) continue;
      const sets = loggedByItem.get(set.planItemId);
      if (sets) sets.push(set);
      else loggedByItem.set(set.planItemId, [set]);
    }
    const state = (id: string) => ({
      id,
      logged: loggedByItem.get(id) ?? [],
      skipped: dayState.skipped.includes(id),
    });

    const day = resolveDay(program, date, dayState.floatingIndex);
    const items: PlanItem[] = [];
    const add = (exId: string | null, init: (exercise: Exercise) => PlanItem): void => {
      const exercise = exId === null ? undefined : lookup(exId);
      if (exercise) items.push(init(exercise));
    };

    if (day !== null && program.type === "fixed") {
      for (const row of day.exercises) {
        add(
          row.exId,
          (exercise) =>
            new PlanItem({
              ...state(row.id),
              exercise,
              label: exercise.group,
              prescription: row,
              supersetId: row.supersetId,
            }),
        );
      }
    }
    if (day !== null && program.type === "cycled") {
      for (const slot of day.slots) {
        add(
          rotatedExercise(slot.id, slot.pool, rotation),
          (exercise) =>
            new PlanItem({
              ...state(slot.id),
              exercise,
              label: MUSCLE_NAMES[slot.muscle],
              prescription: slot,
            }),
        );
      }
    }
    for (const extra of dayState.extras) {
      add(
        extra.exId,
        (exercise) =>
          new PlanItem({ ...state(extra.id), exercise, label: exercise.group, prescription: null }),
      );
    }
    return new TodayPlan(today, day?.name ?? null, items);
  }

  item(id: string): PlanItem | undefined {
    return this.items.find((i) => i.id === id);
  }

  /** Prescribed sets across items that were not skipped. */
  get setsPlanned(): number {
    return this.items.reduce((n, i) => n + (i.skipped ? 0 : i.planned), 0);
  }

  get setsDone(): number {
    return this.items.reduce((n, i) => n + i.done, 0);
  }

  get setsRemaining(): number {
    return this.items.reduce((n, i) => n + i.remaining, 0);
  }

  /** Everything prescribed has been logged (and something actually was). */
  get isComplete(): boolean {
    return this.setsRemaining === 0 && this.setsDone > 0;
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
