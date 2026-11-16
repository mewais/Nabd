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

  /** The very last set logged for this exercise, on any day. */
  latest(): Performance | null {
    const lastDate = this.dates.at(-1);
    return lastDate === undefined ? null : this.on(lastDate).at(-1)!;
  }

  /** Strength score of each session's best set, oldest first (for trend charts). */
  bestPerSession(): number[] {
    return this.dates.map((d) => Math.max(...this.on(d).map(strengthScore)));
  }
}

/** Estimated 1RM (Epley) for weighted sets; plain reps/seconds otherwise. */
export function strengthScore({ reps, weight }: Performance): number {
  return weight !== null && weight > 0 ? weight * (1 + reps / 30) : reps;
}
