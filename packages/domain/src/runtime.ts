import { z } from "zod";
import { MUSCLE_PRIMARY_GROUP, MuscleKeySchema } from "./muscles";
import { SetCountsSchema, SetTypeSchema } from "./program";
import { dateKey } from "./dates";
import { isRecord } from "./json";
import type { Exercise } from "./exercise";
import { musclesOf } from "./exercise";

/** What prompted a logged set: an idle moment, the timer, or the user's own initiative. */
export const TRIGGERS = ["idle", "timer", "manual"] as const;
const TriggerSchema = z.enum(TRIGGERS);
export type Trigger = z.infer<typeof TriggerSchema>;

export const TRIGGER_NAMES: Record<Trigger, string> = {
  idle: "Idle detected",
  timer: "Timer",
  manual: "Manual",
};

const LoggedSetFields = z.object({
  id: z.string(),
  exId: z.string(),
  exercise: z.string(),
  /**
   * The exercise's group when the set was logged. A record only — nothing reads
   * it back — so it is not held to today's list of groups: a history row must
   * never become unreadable over a label.
   */
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
  /**
   * The session the set belongs to, as the date key of the day it began: one
   * visit to a program day. That is the set's own `date`, except on a floating
   * plan whose unfinished day came back, where every set of the visit belongs
   * to the session it began on an earlier day. Progression reasons in
   * sessions; calendar statistics (streaks, completion) in dates.
   */
  session: z.string(),
});

/**
 * A persisted, completed set (one row of history). A row stored before sets
 * had a session belongs to the session of its own date.
 */
export const LoggedSetSchema = z.preprocess(
  (row) => (isRecord(row) && row.session === undefined ? { ...row, session: row.date } : row),
  LoggedSetFields,
);
export type LoggedSet = z.infer<typeof LoggedSetSchema>;

/** What a history row records beyond its exercise and its moment. */
type SetDetails = Pick<LoggedSet, "id" | "value" | "weight" | "trigger" | "planItemId" | "setType">;

/** Which day a set counts toward, and which session it belongs to. */
export type SetDay = Pick<LoggedSet, "date" | "session">;

/**
 * The history row for a set of `exercise` performed at `at`. It counts toward
 * the day `day.date` — the day that was open when it was logged, which is
 * `at`'s own calendar day unless the clock has been set back since — and
 * belongs to the session `day.session` (by default, that day's own).
 */
export function loggedSet(
  exercise: Exercise,
  at: Date,
  details: SetDetails,
  day: SetDay = { date: dateKey(at), session: dateKey(at) },
): LoggedSet {
  return {
    ...details,
    exId: exercise.id,
    exercise: exercise.name,
    group: exercise.group,
    muscles: musclesOf(exercise),
    ts: at.toISOString(),
    date: day.date,
    session: day.session,
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

/**
 * Where each cycled pool stands: the id of the exercise that is up next, keyed
 * by cycled-slot id. An exercise id rather than a position in the pool, so
 * editing the pool never skips or repeats an exercise; a slot without an entry
 * (or whose entry has left the pool) starts from the pool's first exercise.
 */
export const RotationStateSchema = z.record(z.string(), z.string());
export type RotationState = z.infer<typeof RotationStateSchema>;

/** An unplanned exercise the user added to a single day. */
const ExtraItemSchema = z.object({ id: z.string(), exId: z.string() });
export type ExtraItem = z.infer<typeof ExtraItemSchema>;

/**
 * What one plan item already did on earlier days: how many of its prescribed
 * sets of each kind, and of which exercise — what a cycled slot gave that
 * day. The sets count only while the item is still on that exercise.
 */
const CarriedItemSchema = z.object({ exId: z.string(), sets: SetCountsSchema });
export type CarriedItem = z.infer<typeof CarriedItemSchema>;

/** What each plan item of a day already did, by plan-item id. */
export type CarriedItems = Record<string, CarriedItem>;

/**
 * An unfinished floating day that came back: the date its visit began — the
 * session all of its sets belong to — and what each plan item already did on
 * the days before (only items with something done are listed).
 */
export const CarriedVisitSchema = z.object({
  startedOn: z.string(),
  items: z.record(z.string(), CarriedItemSchema),
});
export type CarriedVisit = z.infer<typeof CarriedVisitSchema>;

/**
 * The per-day bookkeeping that is not derivable from program + history: which
 * floating day we are on and what it already got done on earlier days, what
 * was skipped, what was added ad hoc, and whether nudges are paused for the day.
 */
export const DayStateSchema = z.object({
  date: z.string(),
  /**
   * Floating plans: the id of the program day we are on (null = the first day).
   * An id, not a position, so reordering or removing other days never changes
   * which day is today.
   */
  dayId: z.string().nullable().default(null),
  /**
   * What an unfinished floating day already has behind it: it comes back with
   * only the rest. Null when the visit began today. Kept, unused, while the
   * plan is on weekdays, so a same-day switch back finds it; the next day of
   * a weekday plan starts without it.
   */
  carried: CarriedVisitSchema.nullable().default(null),
  skipped: z.array(z.string()).default([]),
  extras: z.array(ExtraItemSchema).default([]),
  /** Nudges are paused until the day ends. */
  paused: z.boolean().default(false),
});
export type DayState = z.infer<typeof DayStateSchema>;

/** A day with nothing skipped, added or paused, on floating day `dayId` (continuing `carried`). */
export const freshDayState = (
  date: Date,
  dayId: string | null = null,
  carried: CarriedVisit | null = null,
): DayState => ({
  date: dateKey(date),
  dayId,
  carried,
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
