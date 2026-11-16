import type { CarriedItems, DayRecord } from "@nabd/domain";
import { sum, totalSets } from "@nabd/domain";
import type { PlanItem } from "./plan-item";

/**
 * What a day owed and what it did, for the rollover and the completion
 * charts: what is left of it, whether it is on record, and what a day that
 * comes back starts from.
 */
export class DayLedger {
  constructor(
    private readonly date: string,
    private readonly items: readonly PlanItem[],
    /** Whether the plan follows its own order (floating) rather than the calendar. */
    private readonly floating: boolean,
    /** Whether the date is one the user works. */
    private readonly workday: boolean,
  ) {}

  private get setsLogged(): number {
    return sum(this.items, (i) => i.logged.length);
  }

  /**
   * Nothing is left to do, and the day was one that counts: a day off on
   * which no set was logged owes nothing by not being a day on at all. A
   * floating plan moves on from a day that owes nothing, never from a day off
   * it sat idle on.
   */
  get owesNothing(): boolean {
    const remaining = sum(this.items, (i) => i.remaining);
    return remaining === 0 && (this.workday || this.setsLogged > 0);
  }

  /**
   * What each prescribed item has done, of which exercise, by item id: what a
   * day that comes back starts from. Items with nothing done are left out.
   */
  get carryOver(): CarriedItems {
    const done = this.items.filter((i) => totalSets(i.completed) > 0);
    return Object.fromEntries(done.map((i) => [i.id, { exId: i.exercise.id, sets: i.completed }]));
  }

  /**
   * How the day stands against what it owed; null when nothing was owed. What
   * an earlier day of an unfinished floating day already did is not owed
   * again, so a day that came back for two sets and got both done is
   * complete. A skipped exercise still counts as owed, while extras and sets
   * beyond a prescription earn nothing: only planned work can complete a plan.
   *
   * A floating plan has no calendar to fall behind: a day it sat idle is not a
   * missed day, so it has no record either until a set is logged or — `closed`
   * — the plan has moved on from it. Nor has a day off on which nothing was logged.
   */
  record(closed = false): DayRecord | null {
    const planned = sum(this.items, (i) => i.owed);
    if (planned === 0 || (this.setsLogged === 0 && this.isNotDue(closed))) return null;
    return {
      date: this.date,
      planned,
      done: sum(this.items, (i) => Math.min(i.logged.length, i.owed)),
    };
  }

  /**
   * How the day that is open stands so far, as Today shows it: read like the
   * record of a day the plan has moved on from, so a floating day counts from
   * the moment the plan is on it and Progress agrees with Today on what is
   * planned. Whether an idle floating day stays on record is for the
   * rollover to decide ({@link record}); a day off counts only once a set is
   * logged on it.
   */
  soFar(): DayRecord | null {
    return this.record(true);
  }

  /** Whether a day with no set logged was not due to be trained (see {@link record}). */
  private isNotDue(closed: boolean): boolean {
    return !this.workday || (this.floating && !closed);
  }
}
