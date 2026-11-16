// The record of what was done: one row per set logged, and what prompted it.

import { z } from "zod";
import { MUSCLE_PRIMARY_GROUP, MuscleKeySchema } from "./muscles";
import { SetTypeSchema } from "./prescription";
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
