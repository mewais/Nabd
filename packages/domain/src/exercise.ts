import { z } from "zod";
import { MUSCLE_NAMES, MuscleKeySchema, MuscleGroupSchema, type MuscleKey } from "./muscles";
import { EquipmentSchema } from "./equipment";
import { TrackingTypeSchema } from "./tracking";

/** A single exercise definition (catalog or user custom). */
export const ExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  group: MuscleGroupSchema,
  primary: z.array(MuscleKeySchema).min(1),
  secondary: z.array(MuscleKeySchema),
  equipment: EquipmentSchema,
  tracking: TrackingTypeSchema,
  custom: z.boolean().optional(),
});

export type Exercise = z.infer<typeof ExerciseSchema>;

/** Finds an exercise by id; undefined once it is no longer in the library. */
export type ExerciseLookup = (exId: string) => Exercise | undefined;

/** The muscles an exercise works, primary ones first. */
export function musclesOf(exercise: Pick<Exercise, "primary" | "secondary">): MuscleKey[] {
  return [...exercise.primary, ...exercise.secondary];
}

/** Display names of the muscles an exercise works, primary ones first. */
export function muscleNames(exercise: Pick<Exercise, "primary" | "secondary">): string[] {
  return musclesOf(exercise).map((muscle) => MUSCLE_NAMES[muscle]);
}
