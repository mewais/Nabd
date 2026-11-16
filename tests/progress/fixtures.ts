// A small but realistic training log, anchored on Wednesday 18 Nov 2026 10:30
// local time. Everything is built with local-time Date constructors and
// dateKey(), so the suite does not depend on the machine's time zone.

import type { Coverage, DayRecord, LoggedSet, MuscleKey, SetType, Trigger } from "@nabd/domain";
import { DEFAULT_SETTINGS, MUSCLES, dateKey } from "@nabd/domain";
import { TrainingStats } from "@nabd/analytics";
import { MuscleVolume } from "@nabd/coverage";
import { ExerciseProgress } from "@nabd/progression";
import { buildProgressVM } from "@nabd/progress";
import type { ProgressVM } from "@nabd/progress";
import type { ProgressTab } from "@nabd/view";
import { dayRecord, logged, nov } from "../support/builders";
import { CATALOG, catalogExercise, catalogLookup } from "../support/exercises";

export const { bench: BENCH, pullUp: PULL_UP, plank: PLANK } = CATALOG;

/** Wednesday 18 November 2026, 10:30 local. */
const WEDNESDAY = nov(18, 10, 30);

/** A set of a catalog exercise at a local date/time in 2026 (month is 1-based here for readability). */
export function loggedSet(
  exId: string,
  [month, day, hour, minute]: [number, number, number, number],
  value: number,
  weight: number | null,
  trigger: Trigger,
  setType: SetType = "working",
): LoggedSet {
  const at = new Date(2026, month - 1, day, hour, minute);
  return logged(catalogExercise(exId), at, value, weight, { trigger, setType });
}

/**
 * Nine sets, oldest first.
 *   Mon 19 Oct  plank 60 s                                   (outside the 30-day window)
 *   Wed 11 Nov  bench warm-up 40×10, bench 55×8
 *   Mon 16 Nov  pull-up ×8
 *   Tue 17 Nov  bench 57.5×8, plank 45 s (evening)
 *   Wed 18 Nov  bench 60×8, bench 60×8, pull-up ×10          (today)
 */
export function history(): LoggedSet[] {
  return [
    loggedSet(PLANK, [10, 19, 18, 0], 60, null, "manual"),
    loggedSet(BENCH, [11, 11, 8, 55], 10, 40, "idle", "warmup"),
    loggedSet(BENCH, [11, 11, 9, 0], 8, 55, "idle"),
    loggedSet(PULL_UP, [11, 16, 9, 30], 8, null, "idle"),
    loggedSet(BENCH, [11, 17, 9, 5], 8, 57.5, "manual"),
    loggedSet(PLANK, [11, 17, 18, 20], 45, null, "timer"),
    loggedSet(BENCH, [11, 18, 9, 15], 8, 60, "idle"),
    loggedSet(BENCH, [11, 18, 9, 40], 8, 60, "idle"),
    loggedSet(PULL_UP, [11, 18, 12, 5], 10, null, "timer"),
  ];
}

const record = (day: number, planned: number, done: number): DayRecord =>
  dayRecord(nov(day), planned, done);

/** Last week: Wed done, Thu skipped. This week: Mon 1/4, Tue 2/4, Wed 3/4. */
export function dayLog(): DayRecord[] {
  return [record(11, 2, 2), record(12, 3, 0), record(16, 4, 1), record(17, 4, 2), record(18, 4, 3)];
}

export const NO_COVERAGE = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Coverage;

export interface Scenario {
  sets?: LoggedSet[];
  log?: DayRecord[];
  now?: Date;
  coverage?: Coverage;
  /** The muscles the plan targets (none unless given). */
  targets?: MuscleKey[];
  tab?: ProgressTab;
}

/** The Progress view model for a history/day log, the way the app builds it. */
export function progressVM({
  sets = history(),
  log = dayLog(),
  now = WEDNESDAY,
  coverage = NO_COVERAGE,
  targets = [],
  tab = "calendar",
}: Scenario = {}): ProgressVM {
  const planned = new MuscleVolume();
  for (const muscle of targets) planned.add(muscle, 3);
  return buildProgressVM({
    stats: new TrainingStats(sets, log, now, DEFAULT_SETTINGS.workDays),
    progress: new ExerciseProgress(sets, catalogLookup),
    unit: "kg",
    coverage,
    planned,
    today: dateKey(now),
    tab,
  });
}

/** Someone who has neither planned nor logged anything. */
export const NEW_USER: Scenario = { sets: [], log: [] };

/** The content of a section that must not be in its empty state. */
export function shown<Section extends object>(section: Section | { empty: string }): Section {
  if ("empty" in section) throw new Error(`section is empty: ${section.empty}`);
  return section;
}
