import { z } from "zod";
import { EQUIPMENT_KEYS, EquipmentSchema } from "./equipment";
import { WeightUnitSchema, kgFromDisplay } from "./weight";

/** The two real themes (translucency is a separate modifier, not a theme). */
const ThemeSchema = z.enum(["light", "dark"]);
export type Theme = z.infer<typeof ThemeSchema>;

export const SettingsSchema = z.object({
  theme: ThemeSchema,
  /** Translucency on/off (the "Glass" toggle). When true the matching glass material is used. */
  glass: z.boolean(),
  /** Glass tint strength (0.1–1.0). */
  opacity: z.number().min(0.1).max(1),
  openAtStartup: z.boolean(),
  minimizedByDefault: z.boolean(),
  /** Minutes after a set before the timer nudges for the next one. */
  interval: z.number().int().min(5).max(180),
  /** Minimum minutes after a set before an idle moment may nudge. */
  minGap: z.number().int().min(1).max(180),
  /** Seconds without keyboard/mouse that count as an idle moment. */
  idleNudge: z.number().int().min(5).max(600),
  /** Workday bounds (minutes since midnight); the app never nudges outside them. */
  workStart: z.number().int().min(0).max(1439),
  workEnd: z.number().int().min(1).max(1440),
  /** Weight unit for display + input (weights are stored canonically in kg). */
  weightUnit: WeightUnitSchema,
  /** Smallest weight jump the user can make, in the display unit (micro-plates go down to 0.25). */
  weightIncrement: z.number().min(0.25).max(50),
  /** Equipment the user owns; the exercise library is filtered to it. */
  equipment: z.array(EquipmentSchema),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  glass: false,
  opacity: 0.7,
  openAtStartup: true,
  minimizedByDefault: false,
  interval: 50,
  minGap: 15,
  idleNudge: 30,
  workStart: 9 * 60,
  workEnd: 18 * 60,
  weightUnit: "kg",
  weightIncrement: 2.5,
  equipment: [...EQUIPMENT_KEYS],
};

/** The smallest load change the user can make, in kg. */
export function loadStepKg(settings: Pick<Settings, "weightIncrement" | "weightUnit">): number {
  return kgFromDisplay(settings.weightIncrement, settings.weightUnit);
}
