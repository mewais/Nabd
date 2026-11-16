import type { LoggedSet } from "@nabd/domain";

/** What was actually performed in one set: reps (or seconds) and load in kg. */
export interface Performance {
  reps: number;
  weight: number | null;
}

const performanceOf = (set: LoggedSet): Performance => ({ reps: set.value, weight: set.weight });

/**
 * One exercise's logged sets grouped into sessions (one per calendar day,
 * oldest first). Warm-ups are excluded: they say nothing about progress.
 */
export class ExerciseHistory {
  private readonly sessions: ReadonlyMap<string, LoggedSet[]>;

  constructor(history: readonly LoggedSet[], exId: string) {
    const sessions = new Map<string, LoggedSet[]>();
    for (const set of history) {
      if (set.exId !== exId || set.setType === "warmup") continue;
      const session = sessions.get(set.date);
      if (session) session.push(set);
      else sessions.set(set.date, [set]);
    }
    this.sessions = new Map([...sessions].sort(([a], [b]) => a.localeCompare(b)));
  }

  get isEmpty(): boolean {
    return this.sessions.size === 0;
  }

  /** Session date keys, oldest first. */
  get dates(): string[] {
    return [...this.sessions.keys()];
  }

  /** The sets logged on `date`, in order. */
  on(date: string): Performance[] {
    return (this.sessions.get(date) ?? []).map(performanceOf);
  }

  /** Up to `count` most recent sessions strictly before `date`, newest first. */
  sessionsBefore(date: string, count: number): Performance[][] {
    return this.dates
      .filter((d) => d < date)
      .slice(-count)
      .reverse()
      .map((d) => this.on(d));
  }

  /** Each session's best set as measured by `score`, oldest first (for trend charts). */
  bestPerSession(score: (set: Performance) => number): number[] {
    return this.dates.map((d) => Math.max(...this.on(d).map(score)));
  }
}

/** Estimated 1RM (Epley) for weighted sets; plain reps/seconds otherwise. */
export function strengthScore({ reps, weight }: Performance): number {
  return weight !== null && weight > 0 ? weight * (1 + reps / 30) : reps;
}

/**
 * Score of an assisted set: its load relative to bodyweight, i.e. the
 * assistance as a negative number. Assistance is help, not load, so less of it
 * must score higher; an unassisted set scores 0.
 */
export function assistedScore({ weight }: Performance): number {
  return -(weight ?? 0);
}
