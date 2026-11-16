import { z } from "zod";
import { MUSCLE_PRIMARY_GROUP, MuscleKeySchema, type MuscleKey } from "./muscles";
import { SetTypeSchema } from "./program";
import { dateKey } from "./dates";
import { musclesOf, type Exercise } from "./exercise";

/** What prompted a logged set. */
const TriggerSchema = z.enum(["idle", "timer", "manual"]);
export type Trigger = z.infer<typeof TriggerSchema>;

/** A persisted, completed set (one row of history). */
export const LoggedSetSchema = z.object({
  id: z.string(),
  exId: z.string(),
  exercise: z.string(),
  group: z.string(),
  muscles: z.array(MuscleKeySchema),
  /** Reps, or seconds for time-based exercises. */
  value: z.number(),
  /** kg, or null for unweighted. */
  weight: z.number().nullable(),
  /** ISO 8601 timestamp. */
  ts: z.string(),
  /** Local date key YYYY-MM-DD. */
  date: z.string(),
  trigger: TriggerSchema,
  /** The plan item (prescription / cycled slot / extra) this set counts toward. */
  planItemId: z.string().nullable().default(null),
  setType: SetTypeSchema.default("working"),
});
export type LoggedSet = z.infer<typeof LoggedSetSchema>;

/** What a history row records beyond its exercise and its moment. */
export type SetDetails = Pick<
  LoggedSet,
  "id" | "value" | "weight" | "trigger" | "planItemId" | "setType"
>;

/** The history row for a set of `exercise` performed at `at`. */
export function loggedSet(exercise: Exercise, at: Date, details: SetDetails): LoggedSet {
  return {
    ...details,
    exId: exercise.id,
    exercise: exercise.name,
    group: exercise.group,
    muscles: musclesOf(exercise),
    ts: at.toISOString(),
    date: dateKey(at),
  };
}

/**
 * A stand-in for the exercise of `set`, rebuilt from what the set recorded, for
 * when the exercise itself is no longer in the library (a deleted custom one).
 * The first logged muscle counts as primary; null if the set names no muscle.
 */
export function exerciseOfSet(set: LoggedSet): Exercise | null {
  const [lead, ...secondary] = set.muscles;
  if (lead === undefined) return null;
  return {
    id: set.exId,
    name: set.exercise,
    group: MUSCLE_PRIMARY_GROUP[lead],
    primary: [lead],
    secondary,
    equipment: "bodyweight",
    tracking: set.weight === null ? "reps_only" : "weight_reps",
    custom: true,
  };
}

/** A warm-up says nothing about volume or progress, so most counts leave it out. */
export const isWarmup = (set: Pick<LoggedSet, "setType">): boolean => set.setType === "warmup";

/** Per-muscle 0–100 coverage. */
export type Coverage = Record<MuscleKey, number>;

/** Cycled rotation pointers, keyed by cycled-slot id. */
export const RotationStateSchema = z.record(z.string(), z.number().int().nonnegative());
export type RotationState = z.infer<typeof RotationStateSchema>;

/** An unplanned exercise the user added to a single day. */
const ExtraItemSchema = z.object({ id: z.string(), exId: z.string() });
export type ExtraItem = z.infer<typeof ExtraItemSchema>;

/**
 * The per-day bookkeeping that is not derivable from program + history: which
 * floating day we are on, what was skipped, what was added ad hoc, and whether
 * nudges are paused for the day.
 */
export const DayStateSchema = z.object({
  date: z.string(),
  /**
   * Floating plans: the id of the program day we are on (null = the first day).
   * An id, not a position, so reordering or removing other days never changes
   * which day is today.
   */
  dayId: z.string().nullable().default(null),
  skipped: z.array(z.string()).default([]),
  extras: z.array(ExtraItemSchema).default([]),
  /** Nudges are paused until the day ends. */
  paused: z.boolean().default(false),
});
export type DayState = z.infer<typeof DayStateSchema>;

/** A day with nothing skipped, added or paused, on floating day `dayId`. */
export const freshDayState = (date: Date, dayId: string | null = null): DayState => ({
  date: dateKey(date),
  dayId,
  skipped: [],
  extras: [],
  paused: false,
});

/** How a finished training day went (drives completion analytics). */
const DayRecordSchema = z.object({
  date: z.string(),
  planned: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
});
export type DayRecord = z.infer<typeof DayRecordSchema>;
export const DayLogSchema = z.array(DayRecordSchema);
