// One prescribed set, changed in place: the arithmetic PrescriptionEditor's
// changes are made of.

import type { Direction, Intensity, SetSpec, SetType } from "@nabd/domain";
import { INTENSITY_SCALES, SET_TYPES, clamp } from "@nabd/domain";

/** How far apart a range starts when a fixed rep count becomes one: 8 → 8–10. */
const RANGE_SPAN = 2;

/** Take the amounts of `fresh` (a set in another measure), range or none alike. */
export function takeAmounts(set: SetSpec, fresh: SetSpec): void {
  set.amount = fresh.amount;
  if (fresh.upTo === undefined) delete set.upTo;
  else set.upTo = fresh.upTo;
}

/** Write the reps as a range (opened above a fixed count) or as a fixed number. */
export function writeReps(set: SetSpec, range: boolean): void {
  if (range) set.upTo ??= set.amount + RANGE_SPAN;
  else delete set.upTo;
}

/** working → warm-up → drop → working. */
export const nextSetType = (type: SetType): SetType =>
  SET_TYPES[(SET_TYPES.indexOf(type) + 1) % SET_TYPES.length] ?? "working";

/** Step the amount (the bottom of a range) by `step`, never below one step; the top follows. */
export function stepAmount(set: SetSpec, direction: Direction, step: number): void {
  set.amount = Math.max(step, set.amount + direction * step);
  if (set.upTo !== undefined) set.upTo = Math.max(set.upTo, set.amount);
}

/** Step the top of a range by `step`, never below its bottom. */
export function stepUpTo(set: SetSpec, direction: Direction, step: number): void {
  set.upTo = Math.max(set.amount, (set.upTo ?? set.amount) + direction * step);
}

/**
 * Give the set intensity `value` on the scale of `mode`, held within its
 * bounds; the scale's usual value when there is none, and no intensity at all
 * where load is not prescribed.
 */
export function holdIntensity(set: SetSpec, mode: Intensity, value?: number): void {
  if (mode === "none") {
    delete set.intensity;
    return;
  }
  const scale = INTENSITY_SCALES[mode];
  set.intensity = clamp(value ?? scale.initial, scale.min, scale.max);
}
