import { z } from "zod";
import { MuscleKeySchema, type MuscleKey } from "./muscles";

/** Status of a Today rhythm slot. */
export const SlotStatusSchema = z.enum(["done", "now", "upcoming", "skipped"]);
export type SlotStatus = z.infer<typeof SlotStatusSchema>;

/**
 * One exercise occurrence in today's rhythm. `sets` = planned set count;
 * `done` = sets completed so far. status becomes "done" when done >= sets.
 */
export const SlotSchema = z.object({
  id: z.string(),
  exId: z.string(),
  exercise: z.string(),
  group: z.string(),
  muscles: z.array(MuscleKeySchema),
  /** Minutes from midnight for the scheduled time of this slot. */
  min: z.number().int(),
  timeStr: z.string(),
  sets: z.number().int().positive(),
  done: z.number().int().nonnegative(),
  status: SlotStatusSchema,
  result: z.string(),
});
export type Slot = z.infer<typeof SlotSchema>;

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
});
export type LoggedSet = z.infer<typeof LoggedSetSchema>;

export interface SessionReceiptItem {
  exercise: string;
  group: string;
  setStr: string;
}

/** Live state of the in-progress logging session (the two-pane modal). */
export interface ActiveSession {
  slotId: string;
  exercise: string;
  group: string;
  muscles: MuscleKey[];
  weighted: boolean;
  unit: "reps" | "sec";
  reps: number;
  weight: number;
  /** Suggested values for the current set. */
  sugg: { sets: number; reps: number; weight: number | null; note: string; up: boolean };
  last: { sets: number; reps: number; weight: number | null } | null;
  logged: SessionReceiptItem[];
  allDone: boolean;
}

/** Per-muscle 0–100 coverage. */
export type Coverage = Record<MuscleKey, number>;

export const CoverageSchema = z.record(MuscleKeySchema, z.number()) as z.ZodType<Coverage>;

/** Cycled rotation pointers, keyed by cycled-slot id. */
export type RotationState = Record<string, number>;
export const RotationStateSchema = z.record(z.string(), z.number().int().nonnegative());

/** Persisted per-day progress for floating progression + rollover. */
export const DayStateSchema = z.object({
  date: z.string(),
  floatingIndex: z.number().int().nonnegative(),
  slots: z.array(SlotSchema),
});
export type DayState = z.infer<typeof DayStateSchema>;
