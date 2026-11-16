import { z } from "zod";
import { MuscleKeySchema } from "./muscles";

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

/** What to do for one exercise: the sets, how they are measured, rest, notes. */
export const PrescriptionSchema = z.object({
  repMode: RepModeSchema,
  intensity: IntensitySchema,
  /** Seconds of rest between back-to-back sets. */
  rest: z.number().int().nonnegative(),
  sets: z.array(SetSpecSchema),
  notes: z.string().optional(),
});
export type Prescription = z.infer<typeof PrescriptionSchema>;

/** A planned exercise within a day (fixed mode). */
export const ExercisePrescriptionSchema = PrescriptionSchema.extend({
  id: z.string(),
  exId: z.string(),
  supersetId: z.string().optional(),
});
export type ExercisePrescription = z.infer<typeof ExercisePrescriptionSchema>;

/**
 * The tag of each row of a day: "A1", "A2"… for the members of a superset, by
 * their place among their partners; null for a row on its own.
 */
export function supersetTags(
  rows: readonly { supersetId?: string | undefined }[],
): (string | null)[] {
  const seen = new Map<string, number>();
  return rows.map(({ supersetId }) => {
    if (supersetId === undefined) return null;
    const position = (seen.get(supersetId) ?? 0) + 1;
    seen.set(supersetId, position);
    return `A${position}`;
  });
}

/** A cycled slot: targets one muscle with a rotating pool sharing one prescription. */
export const CycledSlotSchema = PrescriptionSchema.extend({
  id: z.string(),
  muscle: MuscleKeySchema,
  pool: z.array(z.string()),
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

/** The program a fresh install starts with. */
export const EMPTY_PROGRAM: Program = {
  name: "My Plan",
  type: "fixed",
  schedule: "weekday",
  days: [],
};
