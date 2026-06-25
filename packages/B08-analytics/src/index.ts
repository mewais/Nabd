// @nabd/analytics — pure Progress-screen analytics from logged history.

import type { LoggedSet, Trigger } from "@nabd/domain";

// ---------------------------------------------------------------------------
// Date helpers (no system clock — all use the `now` parameter)
// ---------------------------------------------------------------------------

/** Return the ISO date string YYYY-MM-DD for a Date in UTC. */
function toDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Return the Monday of the ISO-ish Mon–Sun week containing `d` (UTC).
 * Returns the result as a Date at midnight UTC.
 */
function weekMonday(d: Date): Date {
  const dow = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMon = dow === 0 ? 6 : dow - 1;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysToMon));
}

/** Add `days` calendar days to a UTC midnight Date. */
function addDays(d: Date, days: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
}

/** Return the number of days in the UTC month of `d`. */
function daysInMonth(d: Date): number {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

// ---------------------------------------------------------------------------
// streak
// ---------------------------------------------------------------------------

/** Consecutive-day training streak ending today (or yesterday). */
export function streak(history: LoggedSet[], now: Date): number {
  if (history.length === 0) return 0;

  const activeDates = new Set(history.map((s) => s.date));
  const todayStr = toDateStr(now);

  // Start from today; if today has no sets, start from yesterday.
  const hasToday = activeDates.has(todayStr);
  let cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!hasToday) {
    cursor = addDays(cursor, -1);
  }

  let count = 0;
  while (activeDates.has(toDateStr(cursor))) {
    count++;
    cursor = addDays(cursor, -1);
  }

  return count;
}

// ---------------------------------------------------------------------------
// setsThisWeek
// ---------------------------------------------------------------------------

/** Total logged sets in the current Mon–Sun week. */
export function setsThisWeek(history: LoggedSet[], now: Date): number {
  const mon = weekMonday(now);
  const sun = addDays(mon, 6);
  const monStr = toDateStr(mon);
  const sunStr = toDateStr(sun);

  return history.filter((s) => s.date >= monStr && s.date <= sunStr).length;
}

// ---------------------------------------------------------------------------
// completionThisWeek
// ---------------------------------------------------------------------------

/** Planned-sets-done completion ratio for the current week, 0–100. */
export function completionThisWeek(history: LoggedSet[], plannedPerWeek: number, now: Date): number {
  if (plannedPerWeek === 0) return 0;
  const done = setsThisWeek(history, now);
  return Math.round(Math.min(100, (done / plannedPerWeek) * 100));
}

// ---------------------------------------------------------------------------
// activeDays30
// ---------------------------------------------------------------------------

/** Distinct active training days in the last 30 days (today inclusive). */
export function activeDays30(history: LoggedSet[], now: Date): number {
  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startDate = addDays(todayMidnight, -30);
  const startStr = toDateStr(startDate);
  const todayStr = toDateStr(todayMidnight);

  const activeDates = new Set(
    history.filter((s) => s.date >= startStr && s.date <= todayStr).map((s) => s.date),
  );
  return activeDates.size;
}

// ---------------------------------------------------------------------------
// timeOfDay
// ---------------------------------------------------------------------------

export interface HourBucket {
  hour: number;
  count: number;
}

/** Histogram of logged sets by hour of day, plus the peak hour. */
export function timeOfDay(history: LoggedSet[]): { buckets: HourBucket[]; peak: number } {
  const counts = new Array<number>(24).fill(0);

  for (const s of history) {
    const hour = new Date(s.ts).getUTCHours();
    counts[hour]++;
  }

  const buckets: HourBucket[] = counts.map((count, hour) => ({ hour, count }));

  let peak = 0;
  let peakCount = 0;
  for (let h = 0; h < 24; h++) {
    if (counts[h] > peakCount) {
      peakCount = counts[h];
      peak = h;
    }
  }

  return { buckets, peak };
}

// ---------------------------------------------------------------------------
// triggerMix
// ---------------------------------------------------------------------------

/** Percentage split of what triggered logged sets (idle/timer/manual). */
export function triggerMix(history: LoggedSet[]): Record<Trigger, number> {
  if (history.length === 0) {
    return { idle: 0, timer: 0, manual: 0 };
  }

  const counts: Record<Trigger, number> = { idle: 0, timer: 0, manual: 0 };
  for (const s of history) {
    counts[s.trigger]++;
  }

  const total = history.length;
  return {
    idle: Math.round((counts.idle / total) * 100),
    timer: Math.round((counts.timer / total) * 100),
    manual: Math.round((counts.manual / total) * 100),
  };
}

// ---------------------------------------------------------------------------
// calendarHeatmap
// ---------------------------------------------------------------------------

export interface CalendarCell {
  day: number;
  /** -1 future, 0 none, 1..3 intensity. */
  level: number;
}

/** Month calendar heatmap levels for the month containing `now`. */
export function calendarHeatmap(history: LoggedSet[], now: Date): CalendarCell[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const todayDay = now.getUTCDate();
  const numDays = daysInMonth(now);

  // Build a count map: "YYYY-MM-DD" → set count
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const dayCounts = new Map<string, number>();

  for (const s of history) {
    if (s.date.startsWith(monthPrefix)) {
      dayCounts.set(s.date, (dayCounts.get(s.date) ?? 0) + 1);
    }
  }

  const cells: CalendarCell[] = [];
  for (let d = 1; d <= numDays; d++) {
    const dayStr = `${monthPrefix}${String(d).padStart(2, "0")}`;
    if (d > todayDay) {
      cells.push({ day: d, level: -1 });
    } else {
      const count = dayCounts.get(dayStr) ?? 0;
      let level: number;
      if (count === 0) {
        level = 0;
      } else if (count <= 2) {
        level = 1;
      } else if (count <= 5) {
        level = 2;
      } else {
        level = 3;
      }
      cells.push({ day: d, level });
    }
  }

  return cells;
}

// ---------------------------------------------------------------------------
// weeklyBars
// ---------------------------------------------------------------------------

/** Sets per week for the last 8 weeks (oldest first, current last). */
export function weeklyBars(history: LoggedSet[], now: Date): number[] {
  const currentMon = weekMonday(now);

  // Build 8 week buckets: index 0 = 7 weeks ago, index 7 = current week
  const bars = new Array<number>(8).fill(0);

  for (const s of history) {
    // Find the Monday of the week containing this set's date
    const [y, m, d] = s.date.split("-").map(Number);
    const setDate = new Date(Date.UTC(y, m - 1, d));
    const setMon = weekMonday(setDate);

    // Compute difference in weeks: positive = setMon is before currentMon
    const diffMs = currentMon.getTime() - setMon.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

    // diffWeeks 0 = current week (index 7), 1 = prev week (index 6), etc.
    if (diffWeeks >= 0 && diffWeeks <= 7) {
      bars[7 - diffWeeks]++;
    }
  }

  return bars;
}

// ---------------------------------------------------------------------------
// completionLast7
// ---------------------------------------------------------------------------

/** Completion percentage for each of the last 7 days (oldest first). */
export function completionLast7(history: LoggedSet[], plannedPerDay: number, now: Date): number[] {
  if (plannedPerDay === 0) return new Array<number>(7).fill(0);

  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Build a map from date string to set count
  const dayCounts = new Map<string, number>();
  for (const s of history) {
    dayCounts.set(s.date, (dayCounts.get(s.date) ?? 0) + 1);
  }

  // Generate 7 days: index 0 = 6 days ago (oldest), index 6 = today
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(todayMidnight, i - 6);
    const dateStr = toDateStr(day);
    const count = dayCounts.get(dateStr) ?? 0;
    return Math.round(Math.min(100, (count / plannedPerDay) * 100));
  });
}
