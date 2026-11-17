import type { LoggedSet, SetType } from "@nabd/domain";
import { isWarmup } from "@nabd/domain";
import { estimatedMax } from "./epley";

/** What was actually performed in one set: reps (or seconds) and load in kg. */
export interface Performance {
  reps: number;
  weight: number | null;
}

const performanceOf = (set: LoggedSet): Performance => ({ reps: set.value, weight: set.weight });

/**
 * One exercise's logged sets grouped into sessions, oldest first: one per
 * visit to a program day, which is one per calendar day except where an
 * unfinished floating day came back — its sets, on whichever days, are one
 * session (see `LoggedSet.session`). Sessions are known by the date key they
 * began on. Warm-ups are left out of the sessions: they say nothing about
 * progress. They are still remembered ({@link latest}), so the next warm-up
 * can start from the last one.
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
      const session = sessions.get(set.session);
      if (session) session.push(set);
      else sessions.set(set.session, [set]);
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

  /** The keys of the sessions — the dates they began on — oldest first. */
  get dates(): string[] {
    return [...this.sessions.keys()];
  }

  /** The sets of session `session`, in order. */
  on(session: string): Performance[] {
    return (this.sessions.get(session) ?? []).map(performanceOf);
  }

  /** The most recent set of `type`; with a `session`, the most recent one of that session. */
  latest(type: SetType, session?: string): Performance | undefined {
    const wanted = (set: LoggedSet): boolean =>
      set.setType === type && (session === undefined || set.session === session);
    const set = this.sets.filter(wanted).at(-1);
    return set && performanceOf(set);
  }

  /** Up to `count` most recent sessions that began before session `session`, newest first. */
  sessionsBefore(session: string, count: number): Performance[][] {
    return this.dates
      .filter((key) => key < session)
      .slice(-count)
      .reverse()
      .map((key) => this.on(key));
  }

  /**
   * The estimated one-rep max, in kg, of the latest session before `session`:
   * its best set's, each set's load read as `moved` says (by default as it
   * is). Undefined when that session moved no load, so there is no estimate
   * to go on.
   */
  estimateBefore(
    session: string,
    moved: (set: Performance) => Performance = (set) => set,
  ): number | undefined {
    const [latest = []] = this.sessionsBefore(session, 1);
    const best = Math.max(0, ...latest.map((set) => estimatedMax(moved(set))));
    return best > 0 ? best : undefined;
  }

  /** Each session's best set as measured by `score`, oldest first (for trend charts). */
  bestPerSession(score: (set: Performance) => number): number[] {
    return this.dates.map((key) => Math.max(...this.on(key).map(score)));
  }
}

/**
 * Score of an assisted set: its load relative to bodyweight, i.e. the
 * assistance as a negative number. Assistance is help, not load, so less of it
 * must score higher; an unassisted set scores 0.
 */
export function assistedScore({ weight }: Performance): number {
  return 0 - (weight ?? 0);
}
