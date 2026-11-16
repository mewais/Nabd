import { z } from "zod";
import { EQUIPMENT_KEYS, EquipmentSchema } from "./equipment";
import { isRecord } from "./json";
import { WeightUnitSchema, kgFromDisplay } from "./weight";
import type { WeightUnit } from "./weight";

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

/** The conventional plate jump in each unit: what a fresh install steps by. */
export const DEFAULT_INCREMENT: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

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
  weightIncrement: DEFAULT_INCREMENT.kg,
  equipment: [...EQUIPMENT_KEYS],
};

/**
 * `settings` with weights shown and entered in `unit`. A weight increment still
 * at its unit's conventional step moves to the new unit's (2.5 kg ↔ 5 lb); one
 * the user chose themselves keeps its number.
 */
export function withWeightUnit(settings: Settings, unit: WeightUnit): Settings {
  const conventional = settings.weightIncrement === DEFAULT_INCREMENT[settings.weightUnit];
  return {
    ...settings,
    weightUnit: unit,
    weightIncrement: conventional ? DEFAULT_INCREMENT[unit] : settings.weightIncrement,
  };
}

/** Whether the workday has a start before its end. */
export const hasWorkday = (settings: Pick<Settings, "workStart" | "workEnd">): boolean =>
  settings.workStart < settings.workEnd;

/**
 * Settings read from storage field by field: every valid field is kept, and a
 * field that is missing (saved by an older version) or invalid takes its
 * default. `reset` names the fields that were there but could not be kept.
 */
export function salvageSettings(stored: unknown): { settings: Settings; reset: string[] } {
  const fields = isRecord(stored) ? stored : {};
  const kept: Record<string, unknown> = {};
  const reset: string[] = [];
  for (const [key, schema] of Object.entries(SettingsSchema.shape)) {
    if (fields[key] === undefined) continue;
    const parsed = schema.safeParse(fields[key]);
    if (parsed.success) kept[key] = parsed.data;
    else reset.push(key);
  }
  const settings = SettingsSchema.parse({ ...DEFAULT_SETTINGS, ...kept });
  if (hasWorkday(settings)) return { settings, reset };
  const { workStart, workEnd } = DEFAULT_SETTINGS;
  return {
    settings: { ...settings, workStart, workEnd },
    reset: [...reset, "workStart", "workEnd"],
  };
}

/** The smallest load change the user can make, in kg. */
export function loadStepKg(settings: Pick<Settings, "weightIncrement" | "weightUnit">): number {
  return kgFromDisplay(settings.weightIncrement, settings.weightUnit);
}
