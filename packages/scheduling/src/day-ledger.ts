import type { CarriedItems, DayRecord } from "@nabd/domain";
import { sum, totalSets } from "@nabd/domain";
import type { TodayPlan } from "./today-plan";

/** What the ledger reads of a day's plan: its items and the totals the plan keeps over them. */
type LedgerPlan = Pick<TodayPlan, "date" | "items" | "setsDone" | "setsRemaining" | "setsOwed">;

/** Where the day stands in the calendar, which decides whether an idle day counts. */
export interface LedgerCalendar {
  /** The plan follows its own order (floating) rather than the calendar. */
  floating: boolean;
  /** The date is one the user works. */
  workday: boolean;
}

/**
 * What a day owed and what it did, for the rollover and the completion
 * charts: what is left of it, whether it is on record, and what a day that
 * comes back starts from.
 */
export class DayLedger {
  constructor(
    private readonly plan: LedgerPlan,
    private readonly calendar: LedgerCalendar,
  ) {}

  /**
   * Nothing is left to do, and the day was one that counts: a day off on
   * which no set was logged owes nothing by not being a day on at all. A
   * floating plan moves on from a day that owes nothing, never from a day off
   * it sat idle on.
   */
  get owesNothing(): boolean {
    return this.plan.setsRemaining === 0 && (this.calendar.workday || this.plan.setsDone > 0);
  }

  /**
   * What each prescribed item has done, of which exercise, by item id: what a
   * day that comes back starts from. Items with nothing done are left out.
   */
  get carryOver(): CarriedItems {
    const done = this.plan.items.filter((i) => totalSets(i.completed) > 0);
    return Object.fromEntries(done.map((i) => [i.id, { exId: i.exercise.id, sets: i.completed }]));
  }

  /**
   * How the day stands against what it owed, while the plan may still come
   * back to it; null when nothing was owed. What an earlier day of an
   * unfinished floating day already did is not owed again, so a day that came
   * back for two sets and got both done is complete. A skipped exercise still
   * counts as owed, while extras and sets beyond a prescription earn nothing:
   * only planned work can complete a plan.
   *
   * A floating plan has no calendar to fall behind: a day it sat idle is not a
   * missed day, so it has no record until a set is logged — or the plan has
   * moved on from it ({@link closedRecord}). Nor has a day off on which
   * nothing was logged.
   */
  record(): DayRecord | null {
    return this.recordOf(this.calendar.floating);
  }

  /**
   * The record of a day the plan has moved on from. It is also how the day
   * that is open stands so far, as Today shows it: a floating day counts from
   * the moment the plan is on it, so Progress agrees with Today on what is
   * planned. A day off still counts only once a set is logged on it.
   */
  closedRecord(): DayRecord | null {
    return this.recordOf(false);
  }

  /** The day's record; `waits` — the plan may come back to the day — spares an idle day one. */
  private recordOf(waits: boolean): DayRecord | null {
    const { date, items, setsOwed, setsDone } = this.plan;
    const notDue = !this.calendar.workday || waits;
    if (setsOwed === 0 || (setsDone === 0 && notDue)) return null;
    return { date, planned: setsOwed, done: sum(items, (i) => Math.min(i.logged.length, i.owed)) };
  }
}
