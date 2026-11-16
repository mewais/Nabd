import { clamp } from "@nabd/domain";
import type { Performance } from "./history";

/** Epley's constant: a set of `reps` stands for a one-rep max of `weight × (1 + reps / 30)`. */
const EPLEY_REPS = 30;

/**
 * The most reps an estimate reads from a set. Beyond it a set says more about
 * endurance than about the most that could be lifted once — and a slip of the
 * keyboard (999 reps) must not turn into a one-rep max of many times the load.
 */
const MOST_REPS_READ = 15;

/** `reps` as the estimate reads them: none below 0, none beyond {@link MOST_REPS_READ}. */
const repsRead = (reps: number): number => clamp(reps, 0, MOST_REPS_READ);

/**
 * Estimated one-rep max in kg (Epley). A set without load scores 0: it says
 * nothing about the weight that could be lifted, and must never be read as its
 * rep count.
 */
export function estimatedMax({ reps, weight }: Performance): number {
  return (weight ?? 0) * (1 + repsRead(reps) / EPLEY_REPS);
}

/** The inverse: the load, in kg, at which `reps` reps is the most a one-rep max of `max` allows. */
export function loadForReps(max: number, reps: number): number {
  return max / (1 + repsRead(reps) / EPLEY_REPS);
}
