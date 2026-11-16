import { z } from "zod";

/** Weight unit. Weights are stored canonically in kg; this controls display + input. */
export const WeightUnitSchema = z.enum(["kg", "lb"]);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

const LB_PER_KG = 2.2046226218;

/** A kg value at gram precision, so repeated stepping never accumulates float noise. */
export function roundKg(kg: number): number {
  return Math.round(kg * 1000) / 1000;
}

/** Convert a canonical kg weight to the display unit, rounded to 1 decimal. */
export function displayWeight(kg: number, unit: WeightUnit): number {
  const value = unit === "lb" ? kg * LB_PER_KG : kg;
  return Math.round(value * 10) / 10;
}

/** Convert a value typed in the display unit back to canonical kg. */
export function kgFromDisplay(value: number, unit: WeightUnit): number {
  return roundKg(unit === "lb" ? value / LB_PER_KG : value);
}

/** Format a canonical kg weight for display, e.g. "60 kg" / "132.3 lb". */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${displayWeight(kg, unit)} ${unit}`;
}
