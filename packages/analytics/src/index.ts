// @nabd/analytics — Progress-screen metrics, all in the user's local time.

import type { DayRecord, LoggedSet, Trigger } from "@nabd/domain";
import { addDays, dateKey, startOfDay, startOfWeek } from "@nabd/domain";

interface HourBucket {
  hour: number;
  count: number;
}

/** How much was trained on a calendar day; `future` days have not happened yet. */
export type CalendarLevel = "future" | "none" | "light" | "medium" | "full";

export interface CalendarCell {
  /** Day of the month, from 1. */
  day: number;
  level: CalendarLevel;
}

interface WeekBar {
  weekStart: Date;
  sets: number;
}

interface DayCompletion {
  date: Date;
  /** 0–100, or null when nothing was planned that day. */
  pct: number | null;
}

const ACTIVE_WINDOW_DAYS = 30;
const WEEKS_SHOWN = 8;
const DAYS_SHOWN = 7;
/** The most sets a day can have and still count as `light`, and as `medium`. */
const LIGHT_DAY_SETS = 2;
const MEDIUM_DAY_SETS = 5;

function calendarLevel(sets: number): CalendarLevel {
  if (sets === 0) return "none";
  if (sets <= LIGHT_DAY_SETS) return "light";
  return sets <= MEDIUM_DAY_SETS ? "medium" : "full";
}

const percent = (done: number, planned: number): number =>
  Math.round(Math.min(1, done / planned) * 100);

/**
 * Read-only statistics over the set history and the per-day completion log.
 * `dayLog` must include a record for today when today has a plan.
 */
export class TrainingStats {
  private readonly setsByDate = new Map<string, number>();
  private readonly recordsByDate: ReadonlyMap<string, DayRecord>;
  private readonly today: Date;

  constructor(
    private readonly history: readonly LoggedSet[],
    dayLog: readonly DayRecord[],
    now: Date,
  ) {
    this.today = startOfDay(now);
    for (const set of history) {
      this.setsByDate.set(set.date, (this.setsByDate.get(set.date) ?? 0) + 1);
    }
    this.recordsByDate = new Map(dayLog.map((r) => [r.date, r]));
  }

  private setsOn(date: Date): number {
    return this.setsByDate.get(dateKey(date)) ?? 0;
  }

  private setsInWeekOf(date: Date): number {
    const monday = startOfWeek(date);
    let sets = 0;
    for (let i = 0; i < 7; i++) sets += this.setsOn(addDays(monday, i));
    return sets;
  }

  /** Consecutive training days ending today (or yesterday, if today is still empty). */
  streak(): number {
    let cursor = this.setsOn(this.today) > 0 ? this.today : addDays(this.today, -1);
    let days = 0;
    while (this.setsOn(cursor) > 0) {
      days++;
      cursor = addDays(cursor, -1);
    }
    return days;
  }

  setsThisWeek(): number {
    return this.setsInWeekOf(this.today);
  }

  /** Distinct training days in the last 30 days, today included. */
  activeDays(): number {
    let days = 0;
    for (let i = 0; i < ACTIVE_WINDOW_DAYS; i++) {
      if (this.setsOn(addDays(this.today, -i)) > 0) days++;
    }
    return days;
  }

  /** Share of this week's planned sets that got done, 0–100 (0 with no plan). */
  completionThisWeek(): number {
    const monday = startOfWeek(this.today);
    let planned = 0;
    let done = 0;
    for (let i = 0; i < 7; i++) {
      const record = this.recordsByDate.get(dateKey(addDays(monday, i)));
      planned += record?.planned ?? 0;
      done += Math.min(record?.done ?? 0, record?.planned ?? 0);
    }
    return planned === 0 ? 0 : percent(done, planned);
  }

  /** Completion for each of the last 7 days, oldest first. */
  completionByDay(): DayCompletion[] {
    return Array.from({ length: DAYS_SHOWN }, (_, i) => {
      const date = addDays(this.today, i - (DAYS_SHOWN - 1));
      const record = this.recordsByDate.get(dateKey(date));
      const pct = record && record.planned > 0 ? percent(record.done, record.planned) : null;
      return { date, pct };
    });
  }

  /** Sets per week for the last 8 weeks, oldest first, current week last. */
  weeklySets(): WeekBar[] {
    const thisMonday = startOfWeek(this.today);
    return Array.from({ length: WEEKS_SHOWN }, (_, i) => {
      const weekStart = addDays(thisMonday, (i - (WEEKS_SHOWN - 1)) * 7);
      return { weekStart, sets: this.setsInWeekOf(weekStart) };
    });
  }

  /** Training-intensity cells for every day of the current month. */
  calendar(): CalendarCell[] {
    const year = this.today.getFullYear();
    const month = this.today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      if (day > this.today.getDate()) return { day, level: "future" };
      return { day, level: calendarLevel(this.setsOn(new Date(year, month, day))) };
    });
  }

  /** Sets by local hour of day, plus the busiest hour (earliest wins ties; null with no sets). */
  timeOfDay(): { buckets: HourBucket[]; peak: number | null } {
    const counts = new Array<number>(24).fill(0);
    for (const set of this.history) counts[new Date(set.ts).getHours()]!++;
    const buckets = counts.map((count, hour) => ({ hour, count }));
    const busiest = Math.max(...counts);
    return { buckets, peak: busiest === 0 ? null : counts.indexOf(busiest) };
  }

  /** Percentage of sets prompted by each trigger. */
  triggerMix(): Record<Trigger, number> {
    const counts: Record<Trigger, number> = { idle: 0, timer: 0, manual: 0 };
    for (const set of this.history) counts[set.trigger]++;
    const total = Math.max(1, this.history.length);
    return {
      idle: Math.round((counts.idle / total) * 100),
      timer: Math.round((counts.timer / total) * 100),
      manual: Math.round((counts.manual / total) * 100),
    };
  }
}
