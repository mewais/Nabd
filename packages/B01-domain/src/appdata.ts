import { z } from "zod";
import { ProgramSchema } from "./program";
import { ExerciseSchema } from "./exercise";
import { SettingsSchema, ThemeSchema } from "./settings";
import { LoggedSetSchema, RotationStateSchema } from "./runtime";

/** Current export/import envelope version. */
export const APPDATA_VERSION = 1;

/**
 * The export/import snapshot. Most fields are optional on import so partial or
 * older documents still apply cleanly (B10 handles migration/merge).
 */
export const AppDataSchema = z.object({
  app: z.literal("Nabd"),
  version: z.number().int().positive(),
  exportedAt: z.string().optional(),
  program: ProgramSchema.optional(),
  customExercises: z.array(ExerciseSchema).optional(),
  settings: SettingsSchema.partial().optional(),
  theme: ThemeSchema.optional(),
  history: z.array(LoggedSetSchema).optional(),
  rotationState: RotationStateSchema.optional(),
});
export type AppData = z.infer<typeof AppDataSchema>;
