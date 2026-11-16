// The changes the planner can make to one prescription (an exercise row or a
// cycled slot). Each one edits the prescription it is given in place;
// ProgramEditor applies them to a copy of the program.

import type { Intensity, Prescription, RepMode, SetSpec, SetType } from "@nabd/domain";
import { SECONDS_STEP } from "@nabd/domain";

const SET_TYPE_CYCLE: SetType[] = ["working", "warmup", "drop"];
const REST_STEP_SEC = 15;
const RPE = { min: 5, max: 10, step: 0.5, initial: 8 };
const PCT = { min: 40, max: 100, step: 2.5, initial: 70 };

/** The set a new prescription starts from: a 45 s hold, or 8–12 reps. */
const defaultSet = (timeBased: boolean): SetSpec =>
  timeBased ? { type: "working", a: 45 } : { type: "working", a: 8, b: 12 };

/** What a newly added exercise or slot is prescribed: three default sets. */
export function defaultPrescription(timeBased: boolean): Prescription {
  const set = defaultSet(timeBased);
  return {
    repMode: timeBased ? "time" : "range",
    intensity: "none",
    rest: timeBased ? 60 : 120,
    sets: [{ ...set }, { ...set }, { ...set }],
  };
}

/**
 * Switch how sets are prescribed. Seconds and reps are different quantities,
 * so crossing between time and a rep mode starts every set from that mode's
 * default instead of reading 45 s as 45 reps.
 */
export function setRepMode(p: Prescription, mode: RepMode): void {
  const fresh = (p.repMode === "time") !== (mode === "time") ? defaultSet(mode === "time") : null;
  p.repMode = mode;
  for (const set of p.sets) {
    if (fresh) set.a = fresh.a;
    if (fresh || mode !== "range") delete set.b;
    if (mode === "range") set.b ??= fresh?.b ?? set.a + 2;
  }
}

export function setIntensity(p: Prescription, mode: Intensity): void {
  p.intensity = mode;
  for (const set of p.sets) {
    if (mode === "none") delete set.val;
    else set.val ??= mode === "rpe" ? RPE.initial : PCT.initial;
  }
}

/** Change rest by `direction` (±1) steps of 15 s. */
export function stepRest(p: Prescription, direction: number): void {
  p.rest = Math.max(0, p.rest + direction * REST_STEP_SEC);
}

/** Append a working set copied from the last set. */
export function addSet(p: Prescription): void {
  const template = p.sets.at(-1) ?? defaultSet(p.repMode === "time");
  p.sets.push({ ...template, type: "working" });
}

/** Prepend a warm-up set modelled on the first set. */
export function addWarmup(p: Prescription): void {
  const template = p.sets[0] ?? defaultSet(p.repMode === "time");
  p.sets.unshift({ ...template, type: "warmup" });
}

/** Remove a set (a prescription always keeps at least one). */
export function removeSet(p: Prescription, index: number): void {
  if (p.sets.length > 1) p.sets.splice(index, 1);
}

/** working → warmup → drop → working. */
export function cycleSetType(p: Prescription, index: number): void {
  const set = p.sets[index];
  if (!set) return;
  set.type = SET_TYPE_CYCLE[(SET_TYPE_CYCLE.indexOf(set.type) + 1) % SET_TYPE_CYCLE.length]!;
}

/** Step a set's reps/seconds (`a`) or the top of its range (`b`), keeping a ≤ b. */
export function stepRep(p: Prescription, index: number, which: "a" | "b", direction: number): void {
  const set = p.sets[index];
  if (!set) return;
  const step = p.repMode === "time" ? SECONDS_STEP : 1;
  if (which === "a") {
    set.a = Math.max(step, set.a + direction * step);
    if (set.b !== undefined) set.b = Math.max(set.b, set.a);
  } else if (set.b !== undefined) {
    set.b = Math.max(set.a, set.b + direction * step);
  }
}

/** Step a set's intensity (RPE or %1RM) within its bounds. */
export function stepVal(p: Prescription, index: number, direction: number): void {
  const set = p.sets[index];
  if (!set || set.val === undefined || p.intensity === "none") return;
  const scale = p.intensity === "rpe" ? RPE : PCT;
  set.val = Math.min(scale.max, Math.max(scale.min, set.val + direction * scale.step));
}
