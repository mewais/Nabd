import { z } from "zod";
import { MuscleGroupSchema } from "./muscles";

/** How reps are prescribed for an exercise. */
export const RepModeSchema = z.enum(["range", "fixed", "time"]);
export type RepMode = z.infer<typeof RepModeSchema>;

/** How load is prescribed. */
export const IntensitySchema = z.enum(["none", "rpe", "pct"]);
export type Intensity = z.infer<typeof IntensitySchema>;

export const SetTypeSchema = z.enum(["warmup", "working", "drop"]);
export type SetType = z.infer<typeof SetTypeSchema>;

/**
 * One prescribed set. `a` = reps / seconds / low end of a range; `b` = high end
 * (range mode only); `val` = RPE (5–10) or %1RM (40–100) when intensity != none.
 */
export const SetSpecSchema = z.object({
  type: SetTypeSchema,
  a: z.number(),
  b: z.number().optional(),
  val: z.number().optional(),
});
export type SetSpec = z.infer<typeof SetSpecSchema>;

/** A planned exercise within a day (fixed mode). */
export const ExercisePrescriptionSchema = z.object({
  id: z.string(),
  exId: z.string(),
  repMode: RepModeSchema,
  intensity: IntensitySchema,
  rest: z.number().int().nonnegative(),
  sets: z.array(SetSpecSchema),
  notes: z.string().optional(),
  supersetId: z.string().optional(),
});
export type ExercisePrescription = z.infer<typeof ExercisePrescriptionSchema>;

/** A cycled muscle-group slot: a pool of exercises + a shared prescription. */
export const CycledSlotSchema = z.object({
  id: z.string(),
  group: MuscleGroupSchema,
  pool: z.array(z.string()),
  repMode: RepModeSchema,
  intensity: IntensitySchema,
  rest: z.number().int().nonnegative(),
  sets: z.array(SetSpecSchema),
  notes: z.string().optional(),
});
export type CycledSlot = z.infer<typeof CycledSlotSchema>;

export const DaySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** 0=Sun..6=Sat for weekday schedules; null = floating/unassigned. */
  weekday: z.number().int().min(0).max(6).nullable(),
  exercises: z.array(ExercisePrescriptionSchema),
  slots: z.array(CycledSlotSchema),
});
export type Day = z.infer<typeof DaySchema>;

export const ProgramTypeSchema = z.enum(["fixed", "cycled"]);
export type ProgramType = z.infer<typeof ProgramTypeSchema>;

export const ScheduleSchema = z.enum(["weekday", "floating"]);
export type Schedule = z.infer<typeof ScheduleSchema>;

export const ProgramSchema = z.object({
  name: z.string(),
  type: ProgramTypeSchema,
  schedule: ScheduleSchema,
  days: z.array(DaySchema),
});
export type Program = z.infer<typeof ProgramSchema>;
