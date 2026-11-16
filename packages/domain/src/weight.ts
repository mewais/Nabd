import { z } from "zod";
import { roundTo } from "./numbers";

/** Weight unit. Weights are stored canonically in kg; this controls display + input. */
export const WEIGHT_UNITS = ["kg", "lb"] as const;
export const WeightUnitSchema = z.enum(WEIGHT_UNITS);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

const LB_PER_KG = 2.2046226218;

/** A kg value at gram precision, so repeated stepping never accumulates float noise. */
export function roundKg(kg: number): number {
  return roundTo(kg, 3);
}

/** The heaviest load a set can record, in kg; anything above it is a typing slip. */
export const MAX_LOAD_KG = 1000;

/** The finest weight increment, in either unit (micro-plates). */
const FINEST_STEP = 0.25;
/** Decimals of a weight shown in the unit it was entered in: enough for the finest increment. */
const ENTERED_DECIMALS = 2;
/** Decimals of a weight shown in the other unit: 20 kg reads "44.1 lb", not "44.09 lb". */
const CONVERTED_DECIMALS = 1;
/** How far a stored weight can be from what was entered: kg are kept to the gram. */
const GRAM = 0.001;

/** A canonical kg weight in `unit`, exactly: for sums that are rounded once, at the end. */
export function inUnit(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kg * LB_PER_KG : kg;
}

/**
 * A canonical kg weight as the number a field holds in `unit`, to two decimals:
 * exact enough to step by the finest increment, and what {@link kgFromDisplay}
 * turns back into kg.
 */
export function editableWeight(kg: number, unit: WeightUnit): number {
  return roundTo(inUnit(kg, unit), ENTERED_DECIMALS);
}

/** Convert a value typed in the display unit back to canonical kg. */
export function kgFromDisplay(value: number, unit: WeightUnit): number {
  return roundKg(unit === "lb" ? value / LB_PER_KG : value);
}

/** Whether `value` is a whole number of finest steps, give or take `tolerance`. */
function isOnStep(value: number, tolerance: number): boolean {
  return Math.abs(value - Math.round(value / FINEST_STEP) * FINEST_STEP) <= tolerance;
}

/**
 * The unit a stored weight was entered in, which only kg are stored for; null
 * for a weight that was entered in neither (it comes from arithmetic across
 * units). A weight belongs to the unit in which it is a whole number of the
 * finest increment, kg first; one typed with odd decimals, to the unit in
 * which it has two decimals at most, kg first. (A guess, wrong only for a few
 * odd-decimal pound entries that happen to be whole hundredths of a kilo.)
 */
function enteredUnit(kg: number): WeightUnit | null {
  if (isOnStep(kg, GRAM / 2)) return "kg";
  if (isOnStep(inUnit(kg, "lb"), GRAM * LB_PER_KG)) return "lb";
  if (roundTo(kg, ENTERED_DECIMALS) === roundKg(kg)) return "kg";
  return kgFromDisplay(editableWeight(kg, "lb"), "lb") === roundKg(kg) ? "lb" : null;
}

/**
 * A canonical kg weight as it is read in the display unit. Shown in the unit it was entered
 * in ({@link enteredUnit}) it reads exactly as entered, to two decimals (20,
 * 21.25, 27.5); shown in the other unit it is a conversion, rounded to one
 * decimal (20 kg is 44.1 lb).
 */
export function displayWeight(kg: number, unit: WeightUnit): number {
  const decimals = enteredUnit(kg) === unit ? ENTERED_DECIMALS : CONVERTED_DECIMALS;
  return roundTo(inUnit(kg, unit), decimals);
}

/** Format a canonical kg weight for display, e.g. "60 kg" / "21.25 kg" / "44.1 lb". */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${displayWeight(kg, unit)} ${unit}`;
}
