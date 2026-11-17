// The per-day bookkeeping the app keeps beside the program and the history:
// where each cycled pool stands, where today stands, and how past days went.

import { z } from "zod";
import { dateKey } from "./dates";
import { SetCountsSchema } from "./prescription";

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
const CarriedVisitSchema = z.object({
  startedOn: z.string(),
  items: z.record(z.string(), CarriedItemSchema),
});
export type CarriedVisit = z.infer<typeof CarriedVisitSchema>;

/**
 * How today was changed for the day, whatever the workday settings say:
 *  - `skipped`: a workday without the workout (a day at the office). Nothing is
 *    nudged and nothing is owed until tomorrow, as on a day off;
 *  - `nudged`: nudging asked for on a day off, or outside the workday hours.
 *    It owes its plan like a workday.
 */
export const DayOverrideSchema = z.enum(["skipped", "nudged"]);
export type DayOverride = z.infer<typeof DayOverrideSchema>;

/**
 * The one change to today's nudging that the moment offers besides a pause:
 * to skip the day or resume it, or, on a day off or outside the workday hours,
 * to have it nudged or stop that.
 */
export type TodayChoice = "skip" | "resume" | "nudge" | "stop";

/**
 * The per-day bookkeeping that is not derivable from program + history: which
 * floating day we are on and what it already got done on earlier days, what
 * was skipped, what was added ad hoc, whether nudges are paused for the day,
 * and whether the day itself was skipped or nudged on.
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
  /** How the day was changed for the day, until it ends; null: the workday settings decide. */
  override: DayOverrideSchema.nullable().default(null),
});
export type DayState = z.infer<typeof DayStateSchema>;

/** A day with nothing skipped, added, paused or overridden, on floating day `dayId` (continuing `carried`). */
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
  override: null,
});

/** How a finished training day went (drives completion analytics). */
const DayRecordSchema = z.object({
  date: z.string(),
  planned: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
  /**
   * The day was optional — a workday skipped, or a day off nudged on: a set
   * on it adds to the streak, and none does not end it. Absent otherwise.
   */
  optional: z.literal(true).optional(),
});
export type DayRecord = z.infer<typeof DayRecordSchema>;
export const DayLogSchema = z.array(DayRecordSchema);
