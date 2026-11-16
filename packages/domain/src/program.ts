import { z } from "zod";
import type { ExerciseLookup } from "./exercise";
import { WEEK_ORDER, WeekdaySchema } from "./dates";
import { MuscleKeySchema } from "./muscles";
import { PrescriptionSchema } from "./prescription";
import { measureOf } from "./tracking";
import type { Measure } from "./tracking";

/**
 * What a cycled pool is counted in: the measure of its first exercise, which
 * every other member shares. Null while the pool is empty (or holds nothing the
 * library knows), when it will take an exercise of either kind.
 */
export function poolMeasure(pool: readonly string[], lookup: ExerciseLookup): Measure | null {
  for (const exId of pool) {
    const exercise = lookup(exId);
    if (exercise) return measureOf(exercise.tracking);
  }
  return null;
}

/** A planned exercise within a day (fixed mode). */
const ExercisePrescriptionSchema = PrescriptionSchema.extend({
  id: z.string(),
  exId: z.string(),
  supersetId: z.string().optional(),
});
export type ExercisePrescription = z.infer<typeof ExercisePrescriptionSchema>;

const FIRST_SUPERSET_LETTER = "A".charCodeAt(0);
const LETTERS = 26;

/**
 * The tag of each row of a day: the day's first superset is A ("A1", "A2"…),
 * its second B, and so on, each member numbered by its place among its
 * partners; null for a row on its own.
 */
export function supersetTags(
  rows: readonly { supersetId?: string | undefined }[],
): (string | null)[] {
  const supersets = new Map<string, { letter: string; members: number }>();
  return rows.map(({ supersetId }) => {
    if (supersetId === undefined) return null;
    let superset = supersets.get(supersetId);
    if (!superset) {
      const letter = String.fromCharCode(FIRST_SUPERSET_LETTER + (supersets.size % LETTERS));
      superset = { letter, members: 0 };
      supersets.set(supersetId, superset);
    }
    superset.members += 1;
    return `${superset.letter}${superset.members}`;
  });
}

/** A cycled slot: targets one muscle with a rotating pool sharing one prescription. */
const CycledSlotSchema = PrescriptionSchema.extend({
  id: z.string(),
  muscle: MuscleKeySchema,
  pool: z.array(z.string()),
});
export type CycledSlot = z.infer<typeof CycledSlotSchema>;

const DaySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** The weekday it is trained on, for weekday schedules; null = floating/unassigned. */
  weekday: WeekdaySchema.nullable(),
  exercises: z.array(ExercisePrescriptionSchema),
  slots: z.array(CycledSlotSchema),
});
export type Day = z.infer<typeof DaySchema>;

const ProgramTypeSchema = z.enum(["fixed", "cycled"]);
export type ProgramType = z.infer<typeof ProgramTypeSchema>;

const ScheduleSchema = z.enum(["weekday", "floating"]);
export type Schedule = z.infer<typeof ScheduleSchema>;

export const ProgramSchema = z.object({
  name: z.string(),
  type: ProgramTypeSchema,
  schedule: ScheduleSchema,
  days: z.array(DaySchema),
});
export type Program = z.infer<typeof ProgramSchema>;

/** Whether the plan follows its own order (floating) rather than the calendar (weekday). */
export const isFloating = (program: Pick<Program, "schedule">): boolean =>
  program.schedule === "floating";

/** `days` in the order they run through the week, Monday first; days on no weekday come last. */
export function inWeekOrder(days: readonly Day[]): Day[] {
  const weekPosition = (day: Day): number =>
    day.weekday === null ? WEEK_ORDER.length : WEEK_ORDER.indexOf(day.weekday);
  return [...days].sort((a, b) => weekPosition(a) - weekPosition(b));
}

/**
 * The day a plan starts with: the earliest in the week, Monday first, for a
 * weekday schedule; the first in order for a floating one. Undefined in an
 * empty plan.
 */
export function firstDay(program: Pick<Program, "schedule" | "days">): Day | undefined {
  return isFloating(program) ? program.days[0] : inWeekOrder(program.days)[0];
}

/** The program a fresh install starts with. */
export const EMPTY_PROGRAM: Program = {
  name: "My Plan",
  type: "fixed",
  schedule: "weekday",
  days: [],
};
