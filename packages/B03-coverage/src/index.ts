// @nabd/coverage — per-muscle training volume, from the plan or from history.

import type { Coverage, Exercise, LoggedSet, MuscleKey, Program } from "@nabd/domain";
import { MUSCLES } from "@nabd/domain";

export type ExerciseLookup = (exId: string) => Exercise | undefined;
export type Recommendation = "rest" | "push" | "none";

/** Weekly sets that count as fully covering a muscle. */
export const FULL_COVERAGE_SETS = 16;
const SECONDARY_WEIGHT = 0.5;
const COVERAGE_WINDOW_DAYS = 7;
const REST_AT_PCT = 66;
const PUSH_AT_PCT = 38;
const INSIGHT_MUSCLES = 3;

/**
 * Sets per muscle. A set counts fully toward an exercise's primary muscles and
 * half toward its secondary ones.
 */
export class MuscleVolume {
  private readonly sets = new Map<MuscleKey, number>();

  /** Credit `count` sets of an exercise (fractional when averaging over a pool). */
  credit(muscles: Pick<Exercise, "primary" | "secondary">, count: number): void {
    for (const m of muscles.primary) this.add(m, count);
    for (const m of muscles.secondary) this.add(m, count * SECONDARY_WEIGHT);
  }

  add(muscle: MuscleKey, sets: number): void {
    this.sets.set(muscle, this.of(muscle) + sets);
  }

  of(muscle: MuscleKey): number {
    return this.sets.get(muscle) ?? 0;
  }

  /** Trained muscles with their set counts, most-trained first. */
  ranked(): { muscle: MuscleKey; sets: number }[] {
    return [...this.sets]
      .map(([muscle, sets]) => ({ muscle, sets }))
      .sort((a, b) => b.sets - a.sets);
  }

  /** 0–100 per muscle, saturating at {@link FULL_COVERAGE_SETS}. */
  toCoverage(): Coverage {
    return Object.fromEntries(
      MUSCLES.map((m) => [m, Math.min(100, (this.of(m) / FULL_COVERAGE_SETS) * 100)]),
    ) as Coverage;
  }

  /**
   * What one pass through the program trains. A cycled slot only runs one pool
   * exercise per session, so its sets are spread evenly over the pool; an empty
   * pool still credits the slot's target muscle.
   */
  static ofProgram(program: Program, lookup: ExerciseLookup): MuscleVolume {
    const volume = new MuscleVolume();
    const workingSets = (p: { sets: { type: string }[] }): number =>
      p.sets.filter((s) => s.type !== "warmup").length;

    for (const day of program.days) {
      if (program.type === "fixed") {
        for (const row of day.exercises) {
          const exercise = lookup(row.exId);
          if (exercise) volume.credit(exercise, workingSets(row));
        }
        continue;
      }
      for (const slot of day.slots) {
        const pool = slot.pool.map(lookup).filter((e): e is Exercise => e !== undefined);
        if (pool.length === 0) volume.add(slot.muscle, workingSets(slot));
        for (const exercise of pool) volume.credit(exercise, workingSets(slot) / pool.length);
      }
    }
    return volume;
  }

  /**
   * What was actually trained in the week ending at `now` (warm-ups excluded).
   * Sets of an exercise no longer in the library fall back to their logged
   * muscle list, first muscle primary.
   */
  static ofRecentHistory(
    history: readonly LoggedSet[],
    lookup: ExerciseLookup,
    now: Date,
  ): MuscleVolume {
    const volume = new MuscleVolume();
    const cutoff = now.getTime() - COVERAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    for (const set of history) {
      if (set.setType === "warmup" || new Date(set.ts).getTime() < cutoff) continue;
      const [first, ...rest] = set.muscles;
      volume.credit(lookup(set.exId) ?? { primary: first ? [first] : [], secondary: rest }, 1);
    }
    return volume;
  }
}

/** rest when well covered, push when lagging. */
export function recommendation(pct: number): Recommendation {
  if (pct >= REST_AT_PCT) return "rest";
  if (pct <= PUSH_AT_PCT) return "push";
  return "none";
}

/**
 * The most over- and under-trained muscles. Only muscles the plan actually
 * targets can be "lagging" — nobody needs to be told to push a muscle they
 * never meant to train.
 */
export function insight(
  actual: Coverage,
  planned: MuscleVolume,
): { rest: MuscleKey[]; push: MuscleKey[] } {
  const most = [...MUSCLES].sort((a, b) => actual[b] - actual[a]);
  const least = [...MUSCLES].sort((a, b) => actual[a] - actual[b]);
  return {
    rest: most.filter((m) => recommendation(actual[m]) === "rest").slice(0, INSIGHT_MUSCLES),
    push: least
      .filter((m) => planned.of(m) > 0 && recommendation(actual[m]) === "push")
      .slice(0, INSIGHT_MUSCLES),
  };
}
