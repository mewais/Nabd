import type { LoggedSet } from "@nabd/domain";

/**
 * The sets logged today, handed out to the plan items they count toward. Each
 * set is given out exactly once, so whatever is still unclaimed after the plan
 * has taken its own is known to be orphaned (its plan item no longer exists).
 */
export class TodaysSets {
  constructor(private unclaimed: readonly LoggedSet[]) {}

  private take(wanted: (set: LoggedSet) => boolean): LoggedSet[] {
    const taken = this.unclaimed.filter(wanted);
    this.unclaimed = this.unclaimed.filter((set) => !wanted(set));
    return taken;
  }

  /** The sets logged against plan item `itemId`. */
  loggedAgainst(itemId: string): LoggedSet[] {
    return this.take((set) => set.planItemId === itemId);
  }

  /** Every set of `exId` that no plan item has claimed yet. */
  ofExercise(exId: string): LoggedSet[] {
    return this.take((set) => set.exId === exId);
  }

  /** The exercises that still have unclaimed sets, in the order they were logged. */
  get unclaimedExercises(): string[] {
    return [...new Set(this.unclaimed.map((set) => set.exId))];
  }
}
