// A small, real training "world" for the UI view-model suites: today's plan,
// the coach and the stats, built from a program and a history the way the app
// builds them, over the made-up exercises.

import type { CarriedVisit, DayRecord, ExtraItem, LoggedSet, Program } from "@nabd/domain";
import { DEFAULT_SETTINGS, dateKey, freshDayState } from "@nabd/domain";
import { TrainingStats } from "@nabd/analytics";
import { ProgressionAdvisor } from "@nabd/progression";
import { TodayPlan } from "@nabd/scheduling";
import { Coach } from "@nabd/session";
import { nov } from "./builders";
import { LIBRARY } from "./exercises";

/** Monday 16 Nov 2026, 10:30 local — "now" unless a test says otherwise. */
export const NOW = nov(16, 10, 30);

export interface WorldInput {
  program: Program;
  history?: LoggedSet[];
  skipped?: string[];
  extras?: ExtraItem[];
  /** What earlier days of this floating day already did. */
  carried?: CarriedVisit | null;
  now?: Date;
  /** Smallest load change, in kg. */
  loadStepKg?: number;
  /** The user's body weight in kg; unknown unless given. */
  bodyWeight?: number | null;
  dayLog?: DayRecord[];
}

/** Today's plan, the coach and the stats, derived from a program and a history. */
export function buildWorld(input: WorldInput) {
  const { program, history = [], skipped = [], extras = [], carried = null } = input;
  const { now = NOW, loadStepKg = 2.5, bodyWeight = null } = input;
  const { workDays } = DEFAULT_SETTINGS;
  const today = dateKey(now);
  const plan = TodayPlan.build({
    program,
    date: now,
    dayState: { ...freshDayState(now, null, carried), skipped, extras },
    rotation: {},
    history,
    lookup: LIBRARY.lookup,
    workDays,
  });
  const coach = new Coach(history, new ProgressionAdvisor(loadStepKg, bodyWeight), plan.session);
  const stats = new TrainingStats(history, input.dayLog ?? [], now, workDays);
  return { plan, coach, stats, now, today, history };
}
