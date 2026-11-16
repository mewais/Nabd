import type { LoggedSet, SetType } from "@nabd/domain";
import { isWarmup } from "@nabd/domain";

/** What was actually performed in one set: reps (or seconds) and load in kg. */
export interface Performance {
  reps: number;
  weight: number | null;
}

const performanceOf = (set: LoggedSet): Performance => ({ reps: set.value, weight: set.weight });

/**
 * One exercise's logged sets grouped into sessions (one per calendar day,
 * oldest first). Warm-ups are left out of the sessions: they say nothing about
 * progress. They are still remembered ({@link latest}), so the next warm-up can
 * start from the last one.
 */
export class ExerciseHistory {
  /** Every set of the exercise, warm-ups included, in the order it was logged. */
  private readonly sets: readonly LoggedSet[];
  private readonly sessions: ReadonlyMap<string, LoggedSet[]>;

  constructor(history: readonly LoggedSet[], exId: string) {
    this.sets = history.filter((set) => set.exId === exId);
    const sessions = new Map<string, LoggedSet[]>();
    for (const set of this.sets) {
      if (isWarmup(set)) continue;
      const session = sessions.get(set.date);
      if (session) session.push(set);
      else sessions.set(set.date, [set]);
    }
    this.sessions = new Map([...sessions].sort(([a], [b]) => a.localeCompare(b)));
  }

  get isEmpty(): boolean {
    return this.sessions.size === 0;
  }

  /** Whether any session set carried load: what decides the unit of the exercise's trend. */
  get hasLoad(): boolean {
    return [...this.sessions.values()].some((session) =>
      session.some((set) => (set.weight ?? 0) > 0),
    );
  }

  /** Session date keys, oldest first. */
  get dates(): string[] {
    return [...this.sessions.keys()];
  }

  /** The sets logged on `date`, in order. */
  on(date: string): Performance[] {
    return (this.sessions.get(date) ?? []).map(performanceOf);
  }

  /** The most recent set of `type`; with a `date`, the most recent one logged that day. */
  latest(type: SetType, date?: string): Performance | undefined {
    const wanted = (set: LoggedSet): boolean =>
      set.setType === type && (date === undefined || set.date === date);
    const set = this.sets.filter(wanted).at(-1);
    return set && performanceOf(set);
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

/**
 * Estimated one-rep max in kg (Epley). A set without load scores 0: it says
 * nothing about the weight that could be lifted, and must never be read as its
 * rep count.
 */
export function estimatedMax({ reps, weight }: Performance): number {
  return (weight ?? 0) * (1 + reps / 30);
}

/**
 * Score of an assisted set: its load relative to bodyweight, i.e. the
 * assistance as a negative number. Assistance is help, not load, so less of it
 * must score higher; an unassisted set scores 0.
 */
export function assistedScore({ weight }: Performance): number {
  return -(weight ?? 0);
}
