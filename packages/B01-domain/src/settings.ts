import { z } from "zod";
import { EQUIPMENT_KEYS, EquipmentSchema } from "./equipment";

/** The two real themes (translucency is a separate modifier, not a theme). */
export const ThemeSchema = z.enum(["light", "dark"]);
export type Theme = z.infer<typeof ThemeSchema>;

/** Weight unit. Weights are stored canonically in kg; this controls display + input. */
export const WeightUnitSchema = z.enum(["kg", "lb"]);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

const LB_PER_KG = 2.2046226218;

/** Convert a canonical kg weight to the display unit, rounded to 1 decimal. */
export function displayWeight(kg: number, unit: WeightUnit): number {
  const v = unit === "lb" ? kg * LB_PER_KG : kg;
  return Math.round(v * 10) / 10;
}

/** Convert a value typed in the display unit back to canonical kg. */
export function kgFromDisplay(value: number, unit: WeightUnit): number {
  const kg = unit === "lb" ? value / LB_PER_KG : value;
  return Math.round(kg * 1000) / 1000;
}

/** Format a canonical kg weight for display, e.g. "60 kg" / "132.3 lb". */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${displayWeight(kg, unit)} ${unit}`;
}

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

/** The material key for a theme + glass flag. */
export type Material = "light" | "dark" | "lightGlass" | "darkGlass";
export function materialKey(theme: Theme, glass: boolean): Material {
  return glass ? ((theme + "Glass") as Material) : theme;
}

/** How long a snoozed or dismissed nudge stays quiet, in minutes. */
export const SNOOZE_MINUTES = 5;
