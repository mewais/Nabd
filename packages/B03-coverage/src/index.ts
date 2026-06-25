// @nabd/coverage — pure coverage & volume engine.

import type { Coverage, MuscleKey, Program, Exercise, LoggedSet } from "@nabd/domain";
import { MUSCLES, GROUP_PRIMARY_MUSCLE } from "@nabd/domain";

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
export function computePlanVolume(program: Program, lookup: ExerciseLookup): Volume {
  const vol: Volume = {};

  function add(muscle: MuscleKey, amount: number): void {
    vol[muscle] = (vol[muscle] ?? 0) + amount;
  }

  for (const day of program.days) {
    if (program.type === "fixed") {
      for (const ep of day.exercises) {
        const exercise = lookup(ep.exId);
        if (exercise === undefined) continue;
        const workingCount = ep.sets.filter((s) => s.type === "working").length;
        for (const muscle of exercise.primary) {
          add(muscle, workingCount);
        }
        for (const muscle of exercise.secondary) {
          add(muscle, workingCount * 0.5);
        }
      }
    } else {
      // cycled
      for (const slot of day.slots) {
        const workingCount = slot.sets.filter((s) => s.type === "working").length;
        const primaryMuscle = GROUP_PRIMARY_MUSCLE[slot.group];
        add(primaryMuscle, workingCount);
      }
    }
  }

  return vol;
}

/** Convert volume to 0–100 coverage (saturating at a reference weekly volume). */
export function planCoverage(volume: Volume): Coverage {
  const cov = emptyCoverage();
  for (const muscle of MUSCLES) {
    const vol = volume[muscle] ?? 0;
    cov[muscle] = Math.min(100, (vol / 16) * 100);
  }
  return cov;
}

/** Build 7-day coverage from logged-set history (recency-weighted). */
export function coverageFrom7dHistory(history: LoggedSet[], now: Date): Coverage {
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const vol: Partial<Record<MuscleKey, number>> = {};

  for (const loggedSet of history) {
    const ts = new Date(loggedSet.ts);
    if (ts < cutoff) continue;

    const muscles = loggedSet.muscles;
    for (let i = 0; i < muscles.length; i++) {
      const muscle = muscles[i];
      const amount = i === 0 ? 1 : 0.5;
      vol[muscle] = (vol[muscle] ?? 0) + amount;
    }
  }

  const cov = emptyCoverage();
  for (const muscle of MUSCLES) {
    const v = vol[muscle] ?? 0;
    cov[muscle] = Math.min(100, (v / 16) * 100);
  }
  return cov;
}

/** Apply one logged set's muscles to a coverage map (primary full, secondary half). */
export function applySetDelta(
  cov: Coverage,
  muscles: MuscleKey[],
  perSet: number,
): Coverage {
  const next = { ...cov };
  for (const muscle of muscles) {
    next[muscle] = Math.min(100, next[muscle] + perSet);
  }
  return next;
}

/** rest if pct >= 66, push if pct <= 38, else none. */
export function recommendation(pct: number): Recommendation {
  if (pct >= 66) return "rest";
  if (pct <= 38) return "push";
  return "none";
}

/** Highest-covered (rest) and lowest-covered (push) muscles, names ready to show. */
export function insight(cov: Coverage): { rest: MuscleKey[]; push: MuscleKey[] } {
  const sorted = [...MUSCLES].sort((a, b) => cov[b] - cov[a]);
  const rest = sorted.slice(0, 2);
  const push = sorted.slice(-2).reverse();
  return { rest, push };
}

/** An all-zero coverage map over every muscle. */
export function emptyCoverage(): Coverage {
  return Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Coverage;
}
