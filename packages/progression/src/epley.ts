import type { Performance } from "./history";

/** Epley's constant: a set of `reps` stands for a one-rep max of `weight × (1 + reps / 30)`. */
const EPLEY_REPS = 30;

/**
 * Estimated one-rep max in kg (Epley). A set without load scores 0: it says
 * nothing about the weight that could be lifted, and must never be read as its
 * rep count.
 */
export function estimatedMax({ reps, weight }: Performance): number {
  return (weight ?? 0) * (1 + reps / EPLEY_REPS);
}

/** The inverse: the load, in kg, at which `reps` reps is the most a one-rep max of `max` allows. */
export function loadForReps(max: number, reps: number): number {
  return max / (1 + reps / EPLEY_REPS);
}
