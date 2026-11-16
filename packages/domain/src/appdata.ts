import { z } from "zod";
import { ProgramSchema } from "./program";
import { CustomExercisesSchema } from "./exercise";
import { SettingsSchema } from "./settings";
import { DayLogSchema, DayStateSchema, RotationStateSchema } from "./day-state";
import { LoggedSetSchema } from "./history";

/** The app's name, in Latin letters: what an export file says it comes from. */
export const APP_NAME = "Nabd";

/** Current export/import envelope version. */
export const APPDATA_VERSION = 5;

/**
 * The export/import snapshot. Most fields are optional on import so partial or
 * older documents still apply cleanly (@nabd/serialization migrates them first).
 */
export const AppDataSchema = z.object({
  app: z.literal(APP_NAME),
  version: z.number().int().positive(),
  exportedAt: z.string().optional(),
  program: ProgramSchema.optional(),
  customExercises: CustomExercisesSchema.optional(),
  settings: SettingsSchema.partial().optional(),
  history: z.array(LoggedSetSchema).optional(),
  rotationState: RotationStateSchema.optional(),
  dayState: DayStateSchema.optional(),
  dayLog: DayLogSchema.optional(),
});
export type AppData = z.infer<typeof AppDataSchema>;
