// What the week's coverage says about each muscle, against what the plan targets.

import type { Coverage, MuscleKey } from "@nabd/domain";
import { MUSCLES } from "@nabd/domain";
import type { MuscleVolume } from "./muscle-volume";

export type Recommendation = "rest" | "push" | "none";

/** Where one muscle stands this week: how covered it is, and what to do about it. */
export interface MuscleStanding {
  muscle: MuscleKey;
  /** Coverage, 0–100. */
  pct: number;
  recommendation: Recommendation;
}

/** The muscles most worth resting and most worth pushing, most pressing first. */
interface VolumeInsight {
  rest: MuscleKey[];
  push: MuscleKey[];
}

const REST_AT_PCT = 66;
const PUSH_AT_PCT = 38;
const INSIGHT_MUSCLES = 3;

/** The week's coverage (`actual`) read against what the program trains (`planned`). */
export class CoverageReport {
  constructor(
    private readonly actual: Coverage,
    private readonly planned: MuscleVolume,
  ) {}

  /**
   * What to do about `muscle`: rest when it is well covered, push when it is
   * lagging. Only a muscle the plan actually targets can be lagging — nobody
   * needs to be told to push a muscle they never meant to train.
   */
  recommendation(muscle: MuscleKey): Recommendation {
    if (this.actual[muscle] >= REST_AT_PCT) return "rest";
    return this.actual[muscle] <= PUSH_AT_PCT && this.planned.of(muscle) > 0 ? "push" : "none";
  }

  /** The standing of each of `muscles`, in the order given. */
  standings(muscles: readonly MuscleKey[]): MuscleStanding[] {
    return muscles.map((muscle) => ({
      muscle,
      pct: this.actual[muscle],
      recommendation: this.recommendation(muscle),
    }));
  }

  /** The most over- and under-trained muscles ({@link recommendation}). */
  insight(): VolumeInsight {
    const most = [...MUSCLES].sort((a, b) => this.actual[b] - this.actual[a]);
    const least = [...MUSCLES].sort((a, b) => this.actual[a] - this.actual[b]);
    const advised = (advice: Recommendation) => (muscle: MuscleKey) =>
      this.recommendation(muscle) === advice;
    return {
      rest: most.filter(advised("rest")).slice(0, INSIGHT_MUSCLES),
      push: least.filter(advised("push")).slice(0, INSIGHT_MUSCLES),
    };
  }
}
