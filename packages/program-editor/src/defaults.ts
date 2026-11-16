// What a new prescription starts from: the set, the way reps are written, the rest.

import type { Measure, Prescription, RepMode, SetSpec } from "@nabd/domain";

/** The set a new prescription starts from: a 45 s hold, or 8–12 reps. */
export const defaultSet = (measure: Measure): SetSpec =>
  measure === "time" ? { type: "working", amount: 45 } : { type: "working", amount: 8, upTo: 12 };

/** How a new prescription writes its sets: as a duration, or as a range of reps. */
export const defaultRepMode = (measure: Measure): RepMode =>
  measure === "time" ? "time" : "range";

/**
 * What a newly added exercise or slot is prescribed, counted in `measure`:
 * three default sets (8–12 reps, or a 45 s hold), with the usual rest.
 */
export function initialPrescription(measure: Measure): Prescription {
  const set = defaultSet(measure);
  return {
    repMode: defaultRepMode(measure),
    intensity: "none",
    rest: measure === "time" ? 60 : 120,
    sets: [{ ...set }, { ...set }, { ...set }],
  };
}
