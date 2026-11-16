import { z } from "zod";
import { roundTo } from "./numbers";

/** Weight unit. Weights are stored canonically in kg; this controls display + input. */
export const WeightUnitSchema = z.enum(["kg", "lb"]);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

const LB_PER_KG = 2.2046226218;

/** A kg value at gram precision, so repeated stepping never accumulates float noise. */
export function roundKg(kg: number): number {
  return roundTo(kg, 3);
}

/** The heaviest load a set can record, in kg; anything above it is a typing slip. */
export const MAX_LOAD_KG = 1000;

/** Decimals a weight is shown with: enough for the finest increment (0.25). */
const DISPLAY_DECIMALS = 2;

/** A canonical kg weight in `unit`, exactly: for sums that are rounded once, at the end. */
export function inUnit(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kg * LB_PER_KG : kg;
}

/** Convert a canonical kg weight to the display unit, to two decimals (20, 21.25, 27.5). */
export function displayWeight(kg: number, unit: WeightUnit): number {
  return roundTo(inUnit(kg, unit), DISPLAY_DECIMALS);
}

/** Convert a value typed in the display unit back to canonical kg. */
export function kgFromDisplay(value: number, unit: WeightUnit): number {
  return roundKg(unit === "lb" ? value / LB_PER_KG : value);
}

/** Format a canonical kg weight for display, e.g. "60 kg" / "21.25 kg" / "132.28 lb". */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${displayWeight(kg, unit)} ${unit}`;
}
