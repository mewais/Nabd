// @nabd/coverage — pure coverage & volume engine.
// SKELETON: signatures frozen; bodies throw until implemented.

import type { Coverage, MuscleKey, Program, Exercise, LoggedSet } from "@nabd/domain";

const NI = (): never => {
  throw new Error("not implemented");
};

/** Per-muscle planned working-set volume. */
export type Volume = Partial<Record<MuscleKey, number>>;

export type Recommendation = "rest" | "push" | "none";

/** Look up an exercise by id (provided by @nabd/dataset at the call site). */
export type ExerciseLookup = (exId: string) => Exercise | undefined;

/**
 * Weekly volume per muscle across a program. Primary muscle = full working-set
 * count, secondary = half. Warmup sets excluded. Cycled slots attribute to the
 * group's primary muscle.
 */
export function computePlanVolume(_program: Program, _lookup: ExerciseLookup): Volume {
  return NI();
}

/** Convert volume to 0–100 coverage (saturating at a reference weekly volume). */
export function planCoverage(_volume: Volume): Coverage {
  return NI();
}

/** Build 7-day coverage from logged-set history (recency-weighted). */
export function coverageFrom7dHistory(_history: LoggedSet[], _now: Date): Coverage {
  return NI();
}

/** Apply one logged set's muscles to a coverage map (primary full, secondary half). */
export function applySetDelta(
  _cov: Coverage,
  _muscles: MuscleKey[],
  _perSet: number,
): Coverage {
  return NI();
}

/** rest if pct >= 66, push if pct <= 38, else none. */
export function recommendation(_pct: number): Recommendation {
  return NI();
}

/** Highest-covered (rest) and lowest-covered (push) muscles, names ready to show. */
export function insight(_cov: Coverage): { rest: MuscleKey[]; push: MuscleKey[] } {
  return NI();
}

/** An all-zero coverage map over every muscle. */
export function emptyCoverage(): Coverage {
  return NI();
}
