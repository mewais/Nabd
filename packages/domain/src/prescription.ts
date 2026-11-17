// What a plan prescribes for one exercise: its sets — of which kind, how many
// reps or seconds, at what intensity — and the rest between them.

import { z } from "zod";
import type { Measure } from "./tracking";

/** How reps are prescribed for an exercise. */
const RepModeSchema = z.enum(["range", "fixed", "time"]);
export type RepMode = z.infer<typeof RepModeSchema>;

/** How load is prescribed: not at all, as an RPE, or as a percentage of the one-rep max. */
export const INTENSITIES = ["none", "rpe", "pct"] as const;
const IntensitySchema = z.enum(INTENSITIES);
export type Intensity = z.infer<typeof IntensitySchema>;

export const INTENSITY_NAMES: Record<Intensity, string> = {
  none: "None",
  rpe: "RPE",
  pct: "%1RM",
};

/** The kinds of set, in the order the planner cycles through them. */
export const SET_TYPES = ["working", "warmup", "drop"] as const;
export const SetTypeSchema = z.enum(SET_TYPES);
export type SetType = z.infer<typeof SetTypeSchema>;

export const SET_TYPE_NAMES: Record<SetType, string> = {
  working: "Working set",
  warmup: "Warm-up",
  drop: "Drop set",
};

const SetCountSchema = z.number().int().nonnegative().default(0);

/** How many sets of each kind. */
export const SetCountsSchema = z.object({
  working: SetCountSchema,
  warmup: SetCountSchema,
  drop: SetCountSchema,
});
export type SetCounts = z.infer<typeof SetCountsSchema>;

export const NO_SETS: Readonly<SetCounts> = { working: 0, warmup: 0, drop: 0 };

/** How many of each kind `types` holds. */
export function countSets(types: readonly SetType[]): SetCounts {
  const counts = { ...NO_SETS };
  for (const type of types) counts[type] += 1;
  return counts;
}

/** How many sets `counts` holds in all. */
export const totalSets = (counts: SetCounts): number =>
  counts.working + counts.warmup + counts.drop;

/** The scale an intensity is prescribed on: its bounds, one step of it, and where it starts. */
interface IntensityScale {
  min: number;
  max: number;
  step: number;
  initial: number;
}

/** RPE 5–10 and 40–100 %1RM: the only values a prescription holds, however it was edited or stored. */
export const INTENSITY_SCALES: Record<Exclude<Intensity, "none">, IntensityScale> = {
  rpe: { min: 5, max: 10, step: 0.5, initial: 8 },
  pct: { min: 40, max: 100, step: 2.5, initial: 70 },
};

/**
 * One prescribed set: `amount` reps or seconds — the low end of the range when
 * `upTo` gives its high end (range mode only) — at `intensity`, an RPE or a
 * %1RM on its scale ({@link INTENSITY_SCALES}), when the prescription
 * prescribes load.
 */
const SetSpecSchema = z.object({
  type: SetTypeSchema,
  amount: z.number(),
  upTo: z.number().optional(),
  intensity: z.number().optional(),
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

/** What a prescription counts its sets in. */
export const measureOfMode = (repMode: RepMode): Measure => (repMode === "time" ? "time" : "reps");

/** The sets of a prescription that count as work: every set but the warm-ups. */
export function workingSets(prescription: Pick<Prescription, "sets">): SetSpec[] {
  return prescription.sets.filter((set) => set.type !== "warmup");
}
