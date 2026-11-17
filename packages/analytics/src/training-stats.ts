// The Progress screen's metrics, all in the user's local time.

import type { DayRecord, LoggedSet, Trigger, Weekday } from "@nabd/domain";
import {
  DAYS_PER_WEEK,
  addDays,
  dateKey,
  isWorkday,
  startOfDay,
  percentOf,
  startOfWeek,
  sum,
} from "@nabd/domain";

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
/** The most sets a day can have and still count as `light`, and as `medium`. */
const LIGHT_DAY_SETS = 2;
const MEDIUM_DAY_SETS = 5;

function calendarLevel(sets: number): CalendarLevel {
  if (sets === 0) return "none";
  if (sets <= LIGHT_DAY_SETS) return "light";
  return sets <= MEDIUM_DAY_SETS ? "medium" : "full";
}

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
    /** The weekdays the user works: the only days a streak is made of. */
    private readonly workDays: readonly Weekday[],
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

  /** The days of the Monday-to-Sunday week that contains `date`. */
  private weekOf(date: Date): Date[] {
    const monday = startOfWeek(date);
    return Array.from({ length: DAYS_PER_WEEK }, (_, i) => addDays(monday, i));
  }

  private setsInWeekOf(date: Date): number {
    return sum(this.weekOf(date), (day) => this.setsOn(day));
  }

  /**
   * Consecutive workdays trained, ending today — or, while today has nothing
   * logged yet, the workday before it. Days off are neutral: a set on one does
   * not extend the streak and an idle one does not break it, so a Monday to
   * Friday streak carries over the weekend. An optional day (a workday
   * skipped, a day off nudged on) can only help: trained, it adds to the
   * streak; idle, it is passed over.
   */
  streak(): number {
    const first = [...this.setsByDate.keys()].sort()[0];
    let cursor = this.setsOn(this.today) > 0 ? this.today : addDays(this.today, -1);
    let days = 0;
    for (; first !== undefined && dateKey(cursor) >= first; cursor = addDays(cursor, -1)) {
      const trained = this.setsOn(cursor) > 0;
      if (this.recordsByDate.get(dateKey(cursor))?.optional) {
        if (trained) days++;
        continue;
      }
      if (!isWorkday({ workDays: this.workDays }, cursor)) continue;
      if (!trained) break;
      days++;
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
    const records = this.weekOf(this.today).map((day) => this.recordsByDate.get(dateKey(day)));
    const planned = sum(records, (record) => record?.planned ?? 0);
    const done = sum(records, (record) => Math.min(record?.done ?? 0, record?.planned ?? 0));
    return percentOf(done, planned);
  }

  /** Completion for each of the last 7 days, oldest first. */
  completionByDay(): DayCompletion[] {
    return Array.from({ length: DAYS_PER_WEEK }, (_, i) => {
      const date = addDays(this.today, i - (DAYS_PER_WEEK - 1));
      const record = this.recordsByDate.get(dateKey(date));
      const pct =
        record && record.planned > 0
          ? percentOf(Math.min(record.done, record.planned), record.planned)
          : null;
      return { date, pct };
    });
  }

  /** Sets per week for the last 8 weeks, oldest first, current week last. */
  weeklySets(): WeekBar[] {
    const thisMonday = startOfWeek(this.today);
    return Array.from({ length: WEEKS_SHOWN }, (_, i) => {
      const weekStart = addDays(thisMonday, (i - (WEEKS_SHOWN - 1)) * DAYS_PER_WEEK);
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
    for (const set of this.history) {
      const hour = new Date(set.ts).getHours();
      counts[hour] = (counts[hour] ?? 0) + 1;
    }
    const buckets = counts.map((count, hour) => ({ hour, count }));
    const busiest = Math.max(...counts);
    return { buckets, peak: busiest === 0 ? null : counts.indexOf(busiest) };
  }

  /** Percentage of sets prompted by each trigger. */
  triggerMix(): Record<Trigger, number> {
    const share = (trigger: Trigger): number =>
      percentOf(this.history.filter((set) => set.trigger === trigger).length, this.history.length);
    return { idle: share("idle"), timer: share("timer"), manual: share("manual") };
  }
}
