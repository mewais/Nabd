import { z } from "zod";
import { MuscleKeySchema, type MuscleKey } from "./muscles";
import { SetTypeSchema } from "./program";

/** What prompted a logged set. */
export const TriggerSchema = z.enum(["idle", "timer", "manual"]);
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

/** Per-muscle 0–100 coverage. */
export type Coverage = Record<MuscleKey, number>;

/** Cycled rotation pointers, keyed by cycled-slot id. */
export const RotationStateSchema = z.record(z.string(), z.number().int().nonnegative());
export type RotationState = z.infer<typeof RotationStateSchema>;

/** An unplanned exercise the user added to a single day. */
export const ExtraItemSchema = z.object({ id: z.string(), exId: z.string() });
export type ExtraItem = z.infer<typeof ExtraItemSchema>;

/**
 * The per-day bookkeeping that is not derivable from program + history: which
 * floating day we are on, what was skipped, and what was added ad hoc.
 */
export const DayStateSchema = z.object({
  date: z.string(),
  floatingIndex: z.number().int().nonnegative().default(0),
  skipped: z.array(z.string()).default([]),
  extras: z.array(ExtraItemSchema).default([]),
});
export type DayState = z.infer<typeof DayStateSchema>;

/** How a finished training day went (drives completion analytics). */
export const DayRecordSchema = z.object({
  date: z.string(),
  planned: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
});
export type DayRecord = z.infer<typeof DayRecordSchema>;
export const DayLogSchema = z.array(DayRecordSchema);
